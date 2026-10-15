import type { Source, Paragraph } from "../vault/types";
import { snapshot } from "../vault/store";
import { sourceDraft } from "./source";
import {
  organizePdf,
  type ImportOptions,
  type PdfPage,
  type ExtractionReport,
} from "./document-layout";
import { readEpub } from "./epub";
export { sourceDraft, sourceColors } from "./source";
export async function importLink(
  url: string,
  topic: string,
): Promise<Omit<Source, "id" | "createdAt" | "updatedAt">> {
  const token = snapshot().settings.cloudToken;
  const r = await fetch("/api/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url }),
  });
  const data = await r
    .json()
    .catch(() => ({ error: "Não foi possível extrair este artigo." }));
  if (!r.ok) throw new Error(data.error);
  return {
    ...sourceDraft(data.title, data.text, data.author, topic),
    url: data.url,
    origin: "link",
    format: "Artigo",
    publishedYear: data.year ?? "",
    ...(Array.isArray(data.paragraphs) ? { paragraphs: data.paragraphs } : {}),
    coverUrl: data.coverUrl,
  };
}
export async function readFileText(
  file: File,
  progress: (message: string) => void,
  options: Partial<ImportOptions> = {},
  signal?: AbortSignal,
): Promise<FileReadResult> {
  signal?.throwIfAborted();
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (extension === "pdf" || file.type === "application/pdf") {
    const pdf = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdf.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdf.getDocument({ data: await file.arrayBuffer() });
    const abort = () => {
      void task.destroy();
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const document = await task.promise;
      const pages: PdfPage[] = [];
      for (let number = 1; number <= document.numPages; number++) {
        signal?.throwIfAborted();
        progress(`Organizando página ${number} de ${document.numPages}…`);
        const page = await document.getPage(number);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        pages.push({
          number,
          width: viewport.width,
          height: viewport.height,
          items: content.items.flatMap((item) => {
            if (!("str" in item)) return [];
            const transform = pdf.Util.transform(
              viewport.transform,
              item.transform,
            );
            return [
              {
                text: item.str,
                x: transform[4],
                y: transform[5],
                width: item.width,
                height: Math.hypot(transform[2], transform[3]),
                font: item.fontName,
              },
            ];
          }),
        });
        page.cleanup();
      }
      signal?.throwIfAborted();
      const metadata = await document.getMetadata().catch(() => undefined);
      const info = metadata?.info as
        { Title?: string; Author?: string } | undefined;
      return {
        ...organizePdf(pages, options),
        pages: document.numPages,
        format: "PDF",
        title: info?.Title,
        author: info?.Author,
      };
    } finally {
      signal?.removeEventListener("abort", abort);
      await task.destroy();
    }
  }
  if (extension === "epub" || extension === "docx") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);
    const parser = new DOMParser();
    signal?.throwIfAborted();
    if (extension === "epub") return readEpub(zip, parser, progress, signal);
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) throw new Error("Este DOCX não contém um documento legível.");
    const doc = parser.parseFromString(xml, "application/xml");
    const parts = [...doc.getElementsByTagName("w:p")]
      .map((p) =>
        [...p.getElementsByTagName("w:t")].map((t) => t.textContent).join(""),
      )
      .filter(Boolean);
    return { text: parts.join("\n\n"), pages: 0, format: "DOCX" };
  }
  if (
    file.type.startsWith("text/") ||
    ["txt", "md", "csv", "rtf"].includes(extension ?? "")
  )
    return {
      text: await file.text(),
      pages: 0,
      format: extension?.toUpperCase() ?? "Texto",
    };
  return {
    text: "",
    pages: 0,
    format: file.type.startsWith("image/")
      ? "Imagem"
      : file.type.startsWith("audio/")
        ? "Áudio"
        : file.type.startsWith("video/")
          ? "Vídeo"
          : (extension?.toUpperCase() ?? "Arquivo"),
  };
}
export type FileReadResult = {
  text: string;
  pages: number;
  paragraphs?: Paragraph[];
  format: string;
  title?: string;
  author?: string;
  language?: string;
  publishedYear?: string;
  cover?: Blob;
  report?: ExtractionReport;
};
