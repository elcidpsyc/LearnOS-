import { openDB } from "idb";
import type { VaultData } from "./types";
import { vaultSchema } from "./model";
import { migrateVault } from "./migrate";
const database = () =>
  openDB("learnos-files-v2", 1, {
    upgrade(db) {
      db.createObjectStore("files");
    },
  });
export async function saveFile(id: string, file: Blob) {
  const db = await database();
  await db.put("files", file, id);
}
export async function localFile(id: string): Promise<Blob | undefined> {
  const db = await database();
  const file = await db.get("files", id);
  if (file) return file;
  if (
    typeof indexedDB.databases === "function" &&
    (await indexedDB.databases()).some((d) => d.name === "learning-os-files")
  ) {
    const old = await openDB("learning-os-files");
    if (old.objectStoreNames.contains("blobs")) return old.get("blobs", id);
  }
  return undefined;
}
export async function getFile(id: string): Promise<Blob | undefined> {
  const file = await localFile(id);
  if (file) return file;
  try {
    const settings = JSON.parse(
      localStorage.getItem("learning_os_v2") ?? "{}",
    ).settings;
    if (settings?.cloudEnabled && settings.cloudToken) {
      const response = await fetch(`/api/file?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${settings.cloudToken}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        await saveFile(id, blob);
        return blob;
      }
    }
  } catch {}
  return undefined;
}
export async function syncFiles(data: VaultData, token: string) {
  const synced: string[] = [];
  for (const source of data.sources) {
    if (!source.fileId || source.fileSynced) continue;
    const file = await localFile(source.fileId);
    if (!file) continue;
    const permit = await fetch("/api/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileId: source.fileId }),
    });
    const issued = await permit.json();
    if (!permit.ok)
      throw new Error(
        issued.error ?? "Não foi possível autorizar o envio do arquivo.",
      );
    const response = await fetch(issued.presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": source.mime ?? file.type ?? "application/octet-stream",
      },
      body: file,
    });
    if (!response.ok)
      throw new Error(
        `Não foi possível sincronizar o arquivo ${source.fileName ?? source.title}.`,
      );
    synced.push(source.id);
  }
  return synced;
}
export async function removeFile(id: string) {
  const db = await database();
  await db.delete("files", id);
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function createBackup(data: VaultData) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const snapshot = {
    ...data,
    settings: { ...data.settings, cloudToken: "", cloudEnabled: false },
  };
  const missing: string[] = [];
  for (const s of data.sources) {
    if (s.fileId) {
      const blob = await getFile(s.fileId);
      if (blob) zip.file(`files/${s.fileId}`, blob);
      else missing.push(s.title);
    }
  }
  zip.file("manifest.json", JSON.stringify(snapshot, null, 2));
  zip.file(
    "LEIA-ME.txt",
    "LearnOS — backup completo. Contém notas, fontes, marcações, revisões e arquivos disponíveis neste aparelho. A chave de sincronização é privada e não é incluída.\n" +
      (missing.length
        ? `Arquivos ausentes no aparelho: ${missing.join(", ")}`
        : ""),
  );
  download(
    await zip.generateAsync({ type: "blob" }),
    `LearnOS-backup-${new Date().toISOString().slice(0, 10)}.zip`,
  );
  return missing;
}
export async function readBackup(
  file: File,
): Promise<{ data: VaultData; restore: () => Promise<void> }> {
  if (file.size > 250 * 1024 * 1024)
    throw new Error("Use um backup de até 250 MB.");
  if (file.name.endsWith(".json")) {
    const data = migrateVault(JSON.parse(await file.text()));
    return { data, restore: async () => {} };
  }
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const manifest = zip.file("manifest.json");
  if (!manifest)
    throw new Error("Este arquivo não é um backup LearnOS completo.");
  const data = vaultSchema.parse(JSON.parse(await manifest.async("string")));
  return {
    data,
    restore: async () => {
      for (const s of data.sources)
        if (s.fileId) {
          const f = zip.file(`files/${s.fileId}`);
          if (f)
            await saveFile(
              s.fileId,
              new Blob([await f.async("arraybuffer")], { type: s.mime }),
            );
        }
    },
  };
}
