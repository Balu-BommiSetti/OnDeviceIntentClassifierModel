import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { DatasetQualityReport } from "./validate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = path.resolve(__dirname, "specs");
const DATASET_PATH = path.resolve(__dirname, "../../exported_dataset/spec_dataset.jsonl");
const QUALITY_REPORT_PATH = path.resolve(__dirname, "../../exported_dataset/dataset_quality_report.json");
const MANIFESTS_DIR = path.resolve(__dirname, "../../exported_dataset/manifests");
const VERSION_FILE = path.join(MANIFESTS_DIR, "current_version.json");

const SEED = 1337; // must match generateFromSpec.ts's SEED

export interface DatasetManifest {
  version: string;
  generatedAt: string;
  specsHash: string;
  rngSeed: number;
  recordCount: number;
  qualityReport: DatasetQualityReport;
  gitCommit: string | null;
}

/** sha256 over every spec file's content, sorted by filename for determinism. */
function hashSpecs(): string {
  const files = fs.readdirSync(SPECS_DIR).filter((f) => f.endsWith(".intent.json")).sort();
  const hash = crypto.createHash("sha256");
  for (const f of files) {
    hash.update(f);
    hash.update(fs.readFileSync(path.join(SPECS_DIR, f)));
  }
  return hash.digest("hex");
}

function gitCommit(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: __dirname }).toString().trim();
  } catch {
    return null; // not a git repo / git unavailable — manifest still valid, just untraced
  }
}

/**
 * Semver bump policy: patch-bumps automatically on every manifest build,
 * unless the specsHash changed from the previous version AND the caller
 * passes bump: "minor" | "major" (a deliberate taxonomy/schema decision, not
 * something this script infers on its own — see build() below).
 */
function nextVersion(previous: string | null, bump: "patch" | "minor" | "major"): string {
  if (!previous) return "1.0.0";
  const [maj, min, pat] = previous.split(".").map(Number);
  if (bump === "major") return `${maj + 1}.0.0`;
  if (bump === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

export function build(bump: "patch" | "minor" | "major" = "patch"): DatasetManifest {
  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`${DATASET_PATH} not found — run generateFromSpec.ts first.`);
  }
  if (!fs.existsSync(QUALITY_REPORT_PATH)) {
    throw new Error(`${QUALITY_REPORT_PATH} not found — run validate.ts first (manifests are only built for a dataset that passed the quality gate).`);
  }

  const qualityReport: DatasetQualityReport = JSON.parse(fs.readFileSync(QUALITY_REPORT_PATH, "utf8"));
  const specsHash = hashSpecs();

  let previousVersion: string | null = null;
  if (fs.existsSync(VERSION_FILE)) {
    previousVersion = JSON.parse(fs.readFileSync(VERSION_FILE, "utf8")).version;
  }
  const version = nextVersion(previousVersion, bump);

  const manifest: DatasetManifest = {
    version,
    generatedAt: new Date().toISOString(),
    specsHash,
    rngSeed: SEED,
    recordCount: qualityReport.totalRows,
    qualityReport,
    gitCommit: gitCommit(),
  };

  fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(MANIFESTS_DIR, `v${version}.json`), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(VERSION_FILE, JSON.stringify({ version }, null, 2));

  return manifest;
}

const bumpArg = (process.argv[2] as "patch" | "minor" | "major") ?? "patch";
if (!["patch", "minor", "major"].includes(bumpArg)) {
  console.error(`Invalid bump type "${bumpArg}" — expected patch, minor, or major.`);
  process.exit(1);
}
const manifest = build(bumpArg);
console.log(`✅ Dataset manifest v${manifest.version} written to exported_dataset/manifests/v${manifest.version}.json`);
console.log(`   records: ${manifest.recordCount}, specsHash: ${manifest.specsHash.slice(0, 12)}…, commit: ${manifest.gitCommit ?? "unknown"}`);
