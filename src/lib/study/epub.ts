import type JSZip from "jszip";
import type { Paragraph } from "../vault/types";
import {
  cleanText,
  DEFAULT_IMPORT_OPTIONS,
  type ExtractionReport,
} from "./document-layout";

/** Resolve ZIP paths against the OPF, without letting a publication escape its archive. */
export function archivePath(base: string, href: string): string | undefined {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(href)) return;
  let decoded: string;
  try {
    decoded = decodeURIComponent(href.split(/[?#]/)[0]);
  } catch {
    return;
  }
  const parts = base.split("/").slice(0, -1);
  for (const part of decoded.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}
const elements = (doc: Document | Element, name: string) =>
  [...doc.querySelectorAll("*")].filter(
    (e) => e.tagName.split(":").at(-1)?.toLowerCase() === name,
  );
export async function readEpub(
  zip: JSZip,
  parser: DOMParser,
  progress: (message: string) => void,
  signal?: AbortSignal,
) {
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container)
    throw new Error(
      "O EPUB não contém o índice de publicação (container.xml).",
    );
  const containerDoc = parser.parseFromString(container, "application/xml");
  const rawPath = elements(containerDoc, "rootfile")[0]?.getAttribute(
    "full-path",
  );
  const opfPath = rawPath && archivePath("", rawPath);
  const opf = opfPath && (await zip.file(opfPath)?.async("string"));
  if (!opf || !opfPath)
    throw new Error("Não foi possível localizar a estrutura deste EPUB.");
  const doc = parser.parseFromString(opf, "application/xml");
  const metadata = elements(doc, "metadata")[0] ?? doc;
  const value = (name: string) =>
    cleanText(elements(metadata, name)[0]?.textContent ?? "");
  const manifest = new Map(
    elements(doc, "item").map((item) => [item.getAttribute("id"), item]),
  );
  const spine = elements(doc, "itemref")
    .filter((n) => n.getAttribute("linear") !== "no")
    .map((n) => manifest.get(n.getAttribute("idref")))
    .filter((n): n is Element => !!n);
  if (!spine.length)
    throw new Error("Este EPUB não oferece uma sequência de leitura legível.");
  const paragraphs: Paragraph[] = [];
  const warnings: string[] = [];
  let chapterCount = 0;
  for (let i = 0; i < spine.length; i++) {
    signal?.throwIfAborted();
    progress(`Organizando seção ${i + 1} de ${spine.length}…`);
    const path = archivePath(opfPath, spine[i].getAttribute("href") ?? "");
    const html = path && (await zip.file(path)?.async("string"));
    if (!html) {
      warnings.push(`Seção ${i + 1} indisponível no arquivo.`);
      continue;
    }
    const sectionDoc = parser.parseFromString(html, "text/html");
    sectionDoc
      .querySelectorAll("script,style,nav,noscript")
      .forEach((n) => n.remove());
    const sectionTitle = cleanText(
      (
        sectionDoc.querySelector("h1,h2,h3") ??
        sectionDoc.querySelector("title")
      )?.textContent ?? `Seção ${i + 1}`,
    );
    const candidates = [
      ...sectionDoc.querySelectorAll(
        "h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,table",
      ),
    ];
    const blocks = candidates.filter(
      (n) =>
        !n.parentElement?.closest(
          "h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,table",
        ),
    );
    if (!blocks.length && sectionDoc.body?.textContent?.trim())
      blocks.push(sectionDoc.body);
    for (const block of blocks) {
      const clone = block.cloneNode(true) as Element;
      clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      const tag = block.tagName.toLowerCase();
      const text =
        tag === "pre"
          ? (clone.textContent ?? "").trim()
          : cleanText(clone.textContent ?? "").replace(/\s*\n\s*/g, "\n");
      if (!text) continue;
      const kind: Paragraph["kind"] = /^h[1-6]$/.test(tag)
        ? "heading"
        : tag === "blockquote"
          ? "quote"
          : tag === "li"
            ? "list"
            : tag === "pre"
              ? "code"
              : tag === "table"
                ? "table"
                : "paragraph";
      if (kind === "heading") chapterCount++;
      paragraphs.push({
        id: paragraphs.length + 1,
        text,
        kind,
        section: sectionTitle,
      });
    }
  }
  const coverId = elements(metadata, "meta")
    .find((n) => n.getAttribute("name") === "cover")
    ?.getAttribute("content");
  const coverItem =
    [...manifest.values()].find((n) =>
      n.getAttribute("properties")?.split(/\s+/).includes("cover-image"),
    ) ?? manifest.get(coverId ?? "");
  let cover: Blob | undefined;
  if (coverItem) {
    const path = archivePath(opfPath, coverItem.getAttribute("href") ?? "");
    const mime = coverItem.getAttribute("media-type") ?? "";
    if (path && /^image\/(?:jpeg|png|webp)$/.test(mime)) {
      const bytes = await zip.file(path)?.async("uint8array");
      if (bytes && bytes.length < 12 * 1024 * 1024)
        cover = new Blob([bytes as BlobPart], { type: mime });
    }
  }
  if (!paragraphs.length)
    warnings.push(
      "Nenhum texto legível foi encontrado. Confira se o EPUB tem proteção ou contém apenas imagens.",
    );
  const report: ExtractionReport = {
    engine: "layout-v2",
    options: DEFAULT_IMPORT_OPTIONS,
    warnings,
    emptyPages: [],
    removedHeaders: 0,
    columnPages: 0,
    chapterCount,
    generatedAt: new Date().toISOString(),
  };
  return {
    text: paragraphs.map((p) => p.text).join("\n\n"),
    paragraphs,
    pages: 0,
    format: "EPUB",
    title: value("title"),
    author: elements(metadata, "creator")
      .map((n) => cleanText(n.textContent ?? ""))
      .filter(Boolean)
      .join("; "),
    language: value("language"),
    publishedYear: value("date").match(/\d{4}/)?.[0],
    cover,
    report,
  };
}

export async function coverThumbnail(blob: Blob): Promise<string | undefined> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 360 / image.width, 540 / image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/webp", 0.82);
    return data.length <= 150000 ? data : undefined;
  } catch {
    return;
  } finally {
    URL.revokeObjectURL(url);
  }
}
