import { issueSignedToken, presignUrl } from "@vercel/blob";
import {
  authorizedWorkspace,
  hash,
  body,
  json,
  failure,
  HttpError,
} from "../server/storage";
export async function POST(req: Request) {
  try {
    const auth = await authorizedWorkspace(req);
    const { fileId } = await body(req);
    if (
      typeof fileId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(fileId) ||
      !auth.data.sources.some((s) => s.fileId === fileId)
    )
      throw new HttpError(403, "Arquivo não autorizado para este espaço.");
    const pathname = `spaces/${hash(auth.token)}/files/${fileId}`;
    const token = await issueSignedToken({
      pathname,
      operations: ["put"],
      maximumSizeInBytes: 120 * 1024 * 1024,
      validUntil: Date.now() + 10 * 60 * 1000,
    });
    const signed = await presignUrl(token, {
      operation: "put",
      pathname,
      access: "private",
      maximumSizeInBytes: 120 * 1024 * 1024,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return json(signed);
  } catch (e) {
    return failure(e);
  }
}
