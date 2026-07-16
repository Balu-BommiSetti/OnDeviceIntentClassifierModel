import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadIntentSpecs, allIntents, allActions } from "./index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Derives downstream artifacts from the Knowledge Spec. In the pilot this emits
 * the model's labels.json shape and an INTENT_ROUTE_MAP fragment; extend to
 * write directly into the app repo once the spine is approved.
 */
export function codegen(outDir: string) {
  const specs = loadIntentSpecs();
  const intents = [...allIntents(specs), "UNKNOWN"];
  const tasks = [...allActions(specs), "UNKNOWN"];

  const labels = {
    intents,
    intent2idx: Object.fromEntries(intents.map((v, i) => [v, i])),
    tasks,
    task2idx: Object.fromEntries(tasks.map((v, i) => [v, i])),
  };

  const routeMap = Object.fromEntries(specs.map((s) => [s.intent, s.advisory_intent]));
  const backendRoutes = Object.fromEntries(specs.map((s) => [s.intent, s.backend_route]));

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "labels.generated.json"), JSON.stringify(labels, null, 2));
  fs.writeFileSync(
    path.join(outDir, "routeMap.generated.json"),
    JSON.stringify({ INTENT_ROUTE_MAP: routeMap, BACKEND_ROUTES: backendRoutes }, null, 2)
  );
  console.log(`✅ Codegen wrote labels.generated.json (${intents.length} intents, ${tasks.length} tasks) and routeMap.generated.json`);
}

codegen(path.resolve(__dirname, "../../exported_dataset/generated"));
