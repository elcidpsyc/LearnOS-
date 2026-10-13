import {
  authorizedWorkspace,
  body,
  json,
  failure,
  limit,
  hash,
} from "../server/storage.js";
import { respond } from "../server/assistant.js";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const { token } = await authorizedWorkspace(req);
    await limit(`ai-minute:${hash(token)}`, 4, 60);
    await limit(`ai-day:${hash(token)}`, 30, 86400);
    return json(await respond(await body(req)));
  } catch (e) {
    return failure(e);
  }
}
