import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { publicHTML } from "./safe-fetch.js";
import { HttpError } from "./storage.js";
import type { Paragraph } from "../src/lib/vault/types.js";
export async function article(url: string) {
  const fetched = await publicHTML(url);
  const { document } = parseHTML(fetched.html);
  const fallbackTitle = document.querySelector("title")?.textContent;
  const image = document
    .querySelector('meta[property="og:image"]')
    ?.getAttribute("content");
  const author =
    document.querySelector('meta[name="author"]')?.getAttribute("content") ??
    document
      .querySelector('meta[property="article:author"]')
      ?.getAttribute("content") ??
    "";
  const parsed = new Readability(document as unknown as Document, {
    charThreshold: 100,
  }).parse();
  if (!parsed?.content)
    throw new HttpError(
      422,
      "Não encontrei um artigo legível. Cole o recorte ou importe um arquivo.",
    );
  const content = parseHTML(
    `<html><body>${parsed.content}</body></html>`,
  ).document;
  const selectors = "h1,h2,h3,h4,p,li,blockquote,pre,table,img";
  const paragraphs: Paragraph[] = [];
  let length = 0;
  const absolute = (value?: string | null) => {
    try {
      const target = new URL(value ?? "", fetched.url);
      return /^https?:$/.test(target.protocol) && value
        ? target.href
        : undefined;
    } catch {
      return undefined;
    }
  };
  for (const node of content.querySelectorAll(selectors)) {
    if (node.parentElement?.closest(selectors)) continue;
    const tag = node.tagName.toLowerCase();
    const text =
      tag === "table"
        ? [...node.querySelectorAll("tr")]
            .map((row) =>
              [...row.querySelectorAll("th,td")]
                .map((cell) => cell.textContent?.trim() ?? "")
                .join("\t"),
            )
            .join("\n")
        : tag === "img"
          ? (node.getAttribute("alt") ?? "Imagem do material")
          : (node.textContent ?? "")
              .replace(tag === "pre" ? /\r/g : /\s+/g, tag === "pre" ? "" : " ")
              .trim();
    if (!text || length >= 500000) continue;
    const kind: Paragraph["kind"] = /^h[1-4]$/.test(tag)
      ? "heading"
      : tag === "li"
        ? "list"
        : tag === "blockquote"
          ? "quote"
          : tag === "pre"
            ? "code"
            : tag === "table"
              ? "table"
              : tag === "img"
                ? "image"
                : "paragraph";
    const href =
      kind === "image" ? absolute(node.getAttribute("src")) : undefined;
    if (kind === "image" && !href) continue;
    const clipped = text.slice(0, 500000 - length);
    length += clipped.length;
    paragraphs.push({
      id: paragraphs.length + 1,
      text: clipped,
      kind,
      ...(href ? { href } : {}),
    });
  }
  const text = paragraphs.map((p) => p.text).join("\n\n");
  if (text.length < 100)
    throw new HttpError(
      422,
      "Esta página não tem texto suficiente para extrair. Cole um recorte.",
    );
  return {
    title: parsed.title || fallbackTitle || new URL(fetched.url).hostname,
    author: parsed.byline || author || "Autor não informado",
    text: text.slice(0, 500000),
    paragraphs,
    coverUrl: absolute(image),
    url: fetched.url,
  };
}
