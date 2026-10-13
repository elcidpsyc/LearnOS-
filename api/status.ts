import { aiReady, MODELS } from "../server/assistant";
import { storageReady, json } from "../server/storage";
export function GET() {
  return json({
    available: aiReady(),
    storage: storageReady(),
    models: Object.entries(MODELS).map(([id, label]) => ({ id, label })),
  });
}
