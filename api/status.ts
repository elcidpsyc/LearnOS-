import { aiReady, MODELS } from "../server/assistant.js";
import { storageReady, json } from "../server/storage.js";
import { searchReady } from "../server/search.js";
export function GET() {
  return json({
    available: aiReady(),
    storage: storageReady(),
    webSearch: searchReady(),
    models: Object.entries(MODELS).map(([id, label]) => ({ id, label })),
  });
}
