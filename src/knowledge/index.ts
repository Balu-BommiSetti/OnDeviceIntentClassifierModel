import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The Knowledge Spec is the SINGLE SOURCE OF TRUTH for the WealthPilot intent
 * taxonomy. Every downstream artifact — the on-device model's labels.json, the
 * app's Layer1Intent union, INTENT_ROUTE_MAP, the training dataset, and the
 * validation gate — is DERIVED from these specs. Nothing in the taxonomy is
 * maintained by hand in more than one place.
 */
export interface IntentSpec {
  intent: string;
  description: string;
  /** The business Actions (taskTypes) this intent legitimately supports. */
  supported_actions: string[];
  required_entities: string[];
  optional_entities: string[];
  /** App-side action name (ActionDispatcher). e.g. LOG_TRANSACTION */
  backend_route: string;
  /** f5 advisory intent (space B) this maps to. e.g. RECORD_EXPENSE */
  advisory_intent: string;
  validation: { min_distinct_utterances_per_action: number };
  /** Natural-language patterns keyed by Action. Each Action MUST have its own
   *  distinct phrasings — the same utterance must never appear under two actions. */
  utterance_patterns: Record<string, string[]>;
  /**
   * Optional. Bare/short conversational-fragment replies — the shape a user's
   * answer takes when responding to a clarification prompt for a single
   * required entity ("Mutual Funds", "500", "yes"), as opposed to
   * utterance_patterns' full-sentence phrasings. Keyed by entity type (not
   * Action), since a clarification reply is answering "what's the value of
   * X", not performing a CREATE/UPDATE/etc. operation in its own right.
   * Generated at low volume (see generateFromSpec.ts's SHORT_REPLY_COUNT) —
   * this is about covering the SHAPE of a bare reply, not exhaustive phrasing.
   * Introduced to close the exact gap that caused the ADD_ASSET clarification-
   * loop bug (backlog #5): TFJS never saw a bare one-word entity-only reply in
   * training, so it never learned to tag one.
   */
  short_reply_patterns?: Record<string, string[]>;
}

const SPECS_DIR = path.resolve(__dirname, "specs");

export function loadIntentSpecs(): IntentSpec[] {
  const files = fs.readdirSync(SPECS_DIR).filter((f) => f.endsWith(".intent.json"));
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(SPECS_DIR, f), "utf8")) as IntentSpec);
}

/** All intent names declared across the specs (the canonical intent label space). */
export function allIntents(specs = loadIntentSpecs()): string[] {
  return specs.map((s) => s.intent).sort();
}

/** All Action names used by any intent (the canonical action label space). */
export function allActions(specs = loadIntentSpecs()): string[] {
  return [...new Set(specs.flatMap((s) => s.supported_actions))].sort();
}

/** The set of VALID (intent, action) pairs. Anything outside this is illegal by construction. */
export function validCombos(specs = loadIntentSpecs()): Set<string> {
  const s = new Set<string>();
  for (const spec of specs) for (const a of spec.supported_actions) s.add(`${spec.intent}|${a}`);
  return s;
}
