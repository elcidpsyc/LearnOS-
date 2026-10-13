import { aiReady, MODELS } from "../server/assistant.js";
import { storageReady, json } from "../server/storage.js";
export function GET() {
  return json({
    available: aiReady(),
    storage: storageReady(),
    models: Object.entries(MODELS).map(([id, label]) => ({ id, label })),
  });
}
