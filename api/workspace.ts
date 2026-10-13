import {
  bearer,
  readWorkspace,
  writeWorkspace,
  body,
  json,
  failure,
  HttpError,
  limit,
} from "../server/storage";
import { vaultSchema } from "../src/lib/vault/model";
import type { VaultData } from "../src/lib/vault/types";
export async function GET(req: Request) {
  try {
    const current = await readWorkspace(bearer(req));
    return current
      ? json({ data: current.data }, 200, { ETag: current.etag })
      : json({ error: "Espaço ainda não criado." }, 404);
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request) {
  try {
    const token = bearer(req);
    const data = vaultSchema.safeParse((await body(req)).data);
    if (!data.success)
      throw new HttpError(400, "O caderno enviado tem um formato inválido.");
    const existing = await readWorkspace(token);
    if (!existing)
      await limit(
        `create:${req.headers.get("x-vercel-forwarded-for") ?? "unknown"}`,
        5,
        86400,
      );
    const saved = await writeWorkspace(
      token,
      data.data as VaultData,
      req.headers.get("if-match") ?? undefined,
    );
    return json({ saved: true }, 200, { ETag: saved.etag });
  } catch (e) {
    return failure(e);
  }
}
