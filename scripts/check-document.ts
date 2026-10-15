/** Local diagnostics: npm exec tsx scripts/check-document.ts /path/to/book.pdf */
import { readFile } from "node:fs/promises";
import { getDocument, Util } from "pdfjs-dist/legacy/build/pdf.mjs";
import JSZip from "jszip";
import { DOMParser } from "linkedom";
import { organizePdf, type PdfPage } from "../src/lib/study/document-layout";
import { readEpub } from "../src/lib/study/epub";
const path = process.argv[2];
if (!path) throw new Error("Informe um arquivo PDF ou EPUB.");
const bytes = new Uint8Array(await readFile(path));
let result;
if (/\.epub$/i.test(path))
  result = await readEpub(
    await JSZip.loadAsync(bytes),
    new DOMParser() as unknown as globalThis.DOMParser,
    () => {},
  );
else {
  const task = getDocument({ data: bytes, useSystemFonts: true });
  try {
    const doc = await task.promise;
    const pages: PdfPage[] = [];
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number),
        viewport = page.getViewport({ scale: 1 }),
        content = await page.getTextContent();
      pages.push({
        number,
        width: viewport.width,
        height: viewport.height,
        items: content.items.flatMap((item) => {
          if (!("str" in item)) return [];
          const t = Util.transform(viewport.transform, item.transform);
          return [
            {
              text: item.str,
              x: t[4],
              y: t[5],
              width: item.width,
              height: Math.hypot(t[2], t[3]),
              font: item.fontName,
            },
          ];
        }),
      });
      page.cleanup();
    }
    console.error(
      JSON.stringify({
        columnPages: pages
          .filter((p) => organizePdf([p]).report.columnPages)
          .map((p) => ({
            page: p.number,
            lines: p.items
              .filter((i) => i.text.trim())
              .slice(0, 25)
              .map((i) => i.text)
              .join(" "),
          })),
      }),
    );
    result = { ...organizePdf(pages), pages: doc.numPages };
  } finally {
    await task.destroy();
  }
}
console.log(
  JSON.stringify(
    {
      pages: result.pages,
      paragraphs: result.paragraphs.length,
      characters: result.text.length,
      report: result.report,
      metadata:
        "title" in result
          ? {
              title: result.title,
              author: result.author,
              cover: result.cover?.size,
            }
          : undefined,
      samples: result.paragraphs
        .filter(
          (p) => p.page === "20" || p.page === "21" || p.kind === "heading",
        )
        .slice(0, 14),
    },
    null,
    2,
  ),
);
