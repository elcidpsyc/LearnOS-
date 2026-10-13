import { createHash } from "node:crypto";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { vaultSchema } from "../src/lib/vault/model";
import type { VaultData } from "../src/lib/vault/types";
export const storageReady = () =>
  Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function bearer(request: Request) {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(
      401,
      "Conecte seu espaço privado em Meu espaço para usar este recurso.",
    );
  return token;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}
export async function readWorkspace(token: string) {
  if (!storageReady())
    throw new HttpError(
      503,
      "A sincronização privada ainda não está configurada neste ambiente.",
    );
  const result = await get(`spaces/${hash(token)}/vault.json`, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200) return null;
  return {
    data: vaultSchema.parse(
      await new Response(result.stream).json(),
    ) as VaultData,
    etag: result.blob.etag,
  };
}
export async function writeWorkspace(
  token: string,
  data: VaultData,
  etag?: string,
) {
  const current = await readWorkspace(token);
  if (current && (!etag || etag !== current.etag))
    throw new HttpError(
      409,
      "O espaço mudou. Sincronize novamente antes de gravar.",
    );
  const validated = vaultSchema.parse(data);
  if (JSON.stringify(validated).length > 3_500_000)
    throw new HttpError(
      413,
      "O caderno ultrapassou o tamanho permitido para sincronização. Faça um backup completo.",
    );
  try {
    return await put(
      `spaces/${hash(token)}/vault.json`,
      JSON.stringify({
        ...validated,
        settings: {
          ...validated.settings,
          cloudToken: "",
          cloudEnabled: false,
        },
      }),
      {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        ...(current ? { ifMatch: current.etag } : { allowOverwrite: false }),
      },
    );
  } catch (e) {
    if (
      e instanceof BlobPreconditionFailedError ||
      String(e).includes("already exists")
    )
      throw new HttpError(409, "O espaço mudou. Sincronize novamente.");
    throw e;
  }
}
export async function authorizedWorkspace(req: Request) {
  const token = bearer(req);
  const current = await readWorkspace(token);
  if (!current)
    throw new HttpError(
      403,
      "Crie ou conecte seu espaço privado em Meu espaço.",
    );
  return { token, ...current };
}
export async function limit(key: string, count: number, seconds: number) {
  const path = `limits/${hash(key)}/${Math.floor(Date.now() / (seconds * 1000))}.json`;
  const previous = await get(path, { access: "private", useCache: false });
  let used = 0;
  let etag: string | undefined;
  if (previous?.statusCode === 200) {
    used = Number((await new Response(previous.stream).json()).count) || 0;
    etag = previous.blob.etag;
  }
  if (used >= count)
    throw new HttpError(
      429,
      "Limite de uso deste período atingido. Tente novamente mais tarde.",
    );
  try {
    await put(path, JSON.stringify({ count: used + 1 }), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
      ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
    });
  } catch (e) {
    if (
      e instanceof BlobPreconditionFailedError ||
      String(e).includes("already exists")
    )
      throw new HttpError(
        429,
        "Uma solicitação já está em andamento. Aguarde e tente novamente.",
      );
    throw e;
  }
}
export async function body(req: Request) {
  const raw = await req.text();
  if (raw.length > 3_600_000)
    throw new HttpError(413, "Solicitação muito grande.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Solicitação inválida.");
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  console.error("learnos_request_failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return json(
    { error: "Não foi possível concluir agora. Tente novamente." },
    500,
  );
}
