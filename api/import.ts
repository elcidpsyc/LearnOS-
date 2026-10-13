import {
  authorizedWorkspace,
  body,
  json,
  failure,
  limit,
  hash,
  HttpError,
} from "../server/storage.js";
import { article } from "../server/article.js";
export const maxDuration = 30;
export async function POST(req: Request) {
  try {
    const { token } = await authorizedWorkspace(req);
    await limit(`import:${hash(token)}`, 20, 3600);
    const { url } = await body(req);
    if (typeof url !== "string" || url.length > 2500)
      throw new HttpError(400, "Cole um endereço válido.");
    return json(await article(url));
  } catch (e) {
    return failure(e);
  }
}
