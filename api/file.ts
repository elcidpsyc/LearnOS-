import { get } from "@vercel/blob";
import {
  authorizedWorkspace,
  hash,
  failure,
  HttpError,
} from "../server/storage.js";
export async function GET(req: Request) {
  try {
    const auth = await authorizedWorkspace(req);
    const id = new URL(req.url).searchParams.get("id");
    const source = auth.data.sources.find((s) => s.fileId === id);
    if (!source || !id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      throw new HttpError(404, "Arquivo não encontrado.");
    const result = await get(`spaces/${hash(auth.token)}/files/${id}`, {
      access: "private",
    });
    if (!result || result.statusCode !== 200)
      throw new HttpError(404, "O arquivo ainda não foi sincronizado.");
    return new Response(result.stream, {
      headers: {
        "Content-Type": source.mime ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(source.fileName ?? source.title)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
