import type { Source, Paragraph } from "../vault/types";
import { snapshot } from "../vault/store";
import { sourceDraft } from "./source";
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
): Promise<{
  text: string;
  pages: number;
  paragraphs?: Paragraph[];
  format: string;
}> {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (extension === "pdf" || file.type === "application/pdf") {
    const pdf = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdf.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdf.getDocument({ data: await file.arrayBuffer() });
    const document = await task.promise;
    const paragraphs: Paragraph[] = [];
    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        progress(`Lendo página ${pageNumber} de ${document.numPages}…`);
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        let block = "";
        const blocks: string[] = [];
        for (const item of content.items) {
          if ("str" in item) {
            block += item.str + (item.hasEOL ? "\n" : " ");
            if (item.hasEOL && block.length > 850) {
              blocks.push(block.trim());
              block = "";
            }
          }
        }
        if (block.trim()) blocks.push(block.trim());
        for (const text of blocks)
          paragraphs.push({
            id: paragraphs.length + 1,
            text,
            page: String(pageNumber),
            firstLetterDrop: paragraphs.length === 0,
          });
        page.cleanup();
      }
      return {
        text: paragraphs.map((p) => p.text).join("\n\n"),
        pages: document.numPages,
        paragraphs,
        format: "PDF",
      };
    } finally {
      await task.destroy();
    }
  }
  if (extension === "epub" || extension === "docx") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);
    const parser = new DOMParser();
    let parts: string[] = [];
    if (extension === "docx") {
      const xml = await zip.file("word/document.xml")?.async("string");
      if (!xml) throw new Error("Este DOCX não contém um documento legível.");
      const document = parser.parseFromString(xml, "application/xml");
      parts = [...document.getElementsByTagName("w:p")]
        .map((p) =>
          [...p.getElementsByTagName("w:t")].map((t) => t.textContent).join(""),
        )
        .filter(Boolean);
    } else {
      const container = await zip
        .file("META-INF/container.xml")
        ?.async("string");
      const opfPath = container
        ? parser
            .parseFromString(container, "application/xml")
            .querySelector("rootfile")
            ?.getAttribute("full-path")
        : undefined;
      const opf = opfPath
        ? await zip.file(opfPath)?.async("string")
        : undefined;
      let paths: string[] = [];
      if (opf && opfPath) {
        const doc = parser.parseFromString(opf, "application/xml");
        const folder = opfPath.includes("/")
          ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
          : "";
        const manifest = new Map(
          [...doc.getElementsByTagName("item")].map((n) => [
            n.getAttribute("id"),
            n.getAttribute("href"),
          ]),
        );
        paths = [...doc.getElementsByTagName("itemref")]
          .map((n) => folder + manifest.get(n.getAttribute("idref")))
          .filter(Boolean);
      } else
        paths = Object.keys(zip.files)
          .filter((p) => /\.(xhtml|html|htm)$/.test(p))
          .sort();
      for (const p of paths) {
        const html = await zip
          .file(decodeURIComponent(p.split("#")[0]))
          ?.async("string");
        if (!html) continue;
        const doc = parser.parseFromString(html, "text/html");
        parts.push(
          ...[...doc.querySelectorAll("h1,h2,h3,p,li,blockquote")]
            .map((p) => p.textContent?.trim() ?? "")
            .filter(Boolean),
        );
      }
    }
    return {
      text: parts.join("\n\n"),
      pages: 0,
      format: extension.toUpperCase(),
    };
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
