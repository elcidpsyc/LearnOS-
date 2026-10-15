import type { Paragraph } from "../vault/types";

export type ImportOptions = {
  columns: "auto" | "single" | "double";
  joinLines: boolean;
  removeHeaders: boolean;
  joinHyphens: boolean;
};
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  columns: "auto",
  joinLines: true,
  removeHeaders: true,
  joinHyphens: true,
};
export type ExtractionReport = {
  engine: "layout-v2";
  options: ImportOptions;
  warnings: string[];
  emptyPages: number[];
  removedHeaders: number;
  columnPages: number;
  chapterCount: number;
  generatedAt: string;
};
export type PdfFragment = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font?: string;
  dropCapBottom?: number;
};
export type PdfPage = {
  number: number;
  width: number;
  height: number;
  items: PdfFragment[];
};
type Line = {
  dropCapBottom?: number;
  text: string;
  x: number;
  right: number;
  y: number;
  height: number;
  items: PdfFragment[];
};
const median = (values: number[]) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};
export const cleanText = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[\u00ad\u200b\ufeff]/g, "")
    .replace(/[\t \u00a0]+/g, " ")
    .trim();
function makeLine(items: PdfFragment[]): Line {
  items.sort((a, b) => a.x - b.x);
  const height = median(items.map((i) => i.height).filter((h) => h > 0)) || 10;
  let text = "";
  for (let i = 0; i < items.length; i++) {
    const item = items[i],
      prior = items[i - 1];
    const value = cleanText(item.text);
    const gap = prior ? item.x - (prior.x + prior.width) : 0;
    const space =
      prior &&
      (/\s$/.test(prior.text) || /^\s/.test(item.text) || gap > height * 0.14);
    if (space && text && !/^[,.;:!?\)\]]/.test(value) && !/[\(\[]$/.test(text))
      text += " ";
    text += value;
  }
  return {
    text,
    x: items[0]?.x ?? 0,
    right: Math.max(...items.map((i) => i.x + Math.max(0, i.width))),
    y: median(items.map((i) => i.y)),
    height,
    dropCapBottom:
      Math.max(0, ...items.map((i) => i.dropCapBottom ?? 0)) || undefined,
    items,
  };
}
export function pdfLines(page: PdfPage): Line[] {
  let items = page.items
    .filter(
      (i) =>
        i.text.trim() && [i.x, i.y, i.width, i.height].every(Number.isFinite),
    )
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const font = median(items.map((i) => i.height).filter((h) => h > 0)) || 10;
  // A drop cap's baseline can sit two or three rows below the sentence it begins.
  items = items
    .map((item) => {
      if (
        item.height < font * 1.85 ||
        !/^\p{Lu}{1,3}$/u.test(item.text.trim()) ||
        item.x > page.width * 0.25
      )
        return item;
      const following = items
        .filter(
          (other) =>
            other !== item &&
            other.height < font * 1.5 &&
            other.x >= item.x + item.width - font * 0.6 &&
            other.x < item.x + item.width + font * 3 &&
            other.y >= item.y - item.height + font * 0.4 &&
            other.y <= item.y + font * 0.2,
        )
        .sort((a, b) => a.y - b.y)[0];
      return following
        ? { ...item, y: following.y, height: font, dropCapBottom: item.y }
        : item;
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: PdfFragment[][] = [];
  for (const item of items) {
    // OCR baselines fluctuate within a printed line; the geometry, not draw order, determines its place.
    const row = rows
      .slice(-3)
      .find(
        (r) =>
          Math.abs(median(r.map((i) => i.y)) - item.y) <=
          Math.max(2, font * 0.56),
      );
    if (row) row.push(item);
    else rows.push([item]);
  }
  return rows
    .map(makeLine)
    .filter((l) => l.text)
    .sort((a, b) => a.y - b.y);
}
function gutterFor(lines: Line[], page: PdfPage, options: ImportOptions) {
  if (options.columns === "single") return null;
  if (options.columns === "double") return page.width / 2;
  const body = lines.filter(
    (l) =>
      l.y > page.height * 0.1 && l.y < page.height * 0.9 && l.items.length >= 4,
  );
  const gaps: { left: number; right: number }[] = [];
  for (const line of body)
    for (let i = 1; i < line.items.length; i++) {
      const left = line.items[i - 1].x + line.items[i - 1].width,
        right = line.items[i].x;
      if (
        right - left > Math.max(line.height * 1.8, page.width * 0.025) &&
        left > page.width * 0.23 &&
        right < page.width * 0.77
      )
        gaps.push({ left, right });
    }
  let best: number | null = null,
    score = 0;
  for (const gap of gaps) {
    const x = (gap.left + gap.right) / 2;
    const votes = gaps.filter((g) => g.left < x && g.right > x).length;
    if (votes > score && votes >= Math.max(4, body.length * 0.4)) {
      best = x;
      score = votes;
    }
  }
  return best;
}
function readingOrder(lines: Line[], gutter: number | null) {
  if (gutter === null) return lines;
  const result: Line[] = [],
    left: Line[] = [],
    right: Line[] = [];
  const flush = () => {
    result.push(...left, ...right);
    left.length = 0;
    right.length = 0;
  };
  for (const line of lines) {
    const crossing = line.items.some(
      (i) => i.x < gutter && i.x + i.width > gutter,
    );
    if (crossing) {
      flush();
      result.push(line);
      continue;
    }
    const a = line.items.filter((i) => i.x < gutter),
      b = line.items.filter((i) => i.x >= gutter);
    if (a.length) left.push(makeLine(a));
    if (b.length) right.push(makeLine(b));
  }
  flush();
  return result;
}
function joinText(previous: string, next: string, options: ImportOptions) {
  if (!options.joinLines) return previous + "\n" + next;
  // Avoid automatically removing productive compound prefixes such as self- or well-.
  if (
    options.joinHyphens &&
    /\p{L}{2,}[-‐]$/u.test(previous) &&
    /^\p{Ll}/u.test(next)
  )
    return /\b(self|well|non|cross|half|long|short|anti|co|pre|post|to|ever|state-of)[-‐]$/i.test(
      previous,
    )
      ? previous + next
      : previous.slice(0, -1) + next;
  return previous + " " + next;
}
export function organizePdf(
  pages: PdfPage[],
  supplied: Partial<ImportOptions> = {},
) {
  const options = { ...DEFAULT_IMPORT_OPTIONS, ...supplied };
  const all = pages.map((page) => ({ page, lines: pdfLines(page) }));
  const repeated = new Map<string, Set<number>>();
  const signature = (text: string) =>
    cleanText(text).replace(/\d+/g, "#").toLocaleLowerCase();
  for (const { page, lines } of all)
    for (const line of lines) {
      if (line.y < page.height * 0.09 || line.y > page.height * 0.92) {
        const key = signature(line.text);
        const occurrences = repeated.get(key) ?? new Set();
        occurrences.add(page.number);
        repeated.set(key, occurrences);
      }
    }
  const paragraphs: Paragraph[] = [];
  const emptyPages: number[] = [];
  let removedHeaders = 0,
    columnPages = 0;
  let previousCanContinue = false;
  for (const { page, lines: raw } of all) {
    if (!raw.length) {
      emptyPages.push(page.number);
      previousCanContinue = false;
      continue;
    }
    const lines = raw.filter((line) => {
      if (!options.removeHeaders) return true;
      const margin = line.y < page.height * 0.09 || line.y > page.height * 0.92;
      const pageNumber = /^(?:\d{1,3}|[ivxlcdm]{1,8})$/i.test(line.text);
      const recurring =
        (repeated.get(signature(line.text))?.size ?? 0) >=
        Math.max(3, Math.min(5, Math.ceil(pages.length * 0.08)));
      if (margin && (recurring || pageNumber) && raw.length > 3) {
        removedHeaders++;
        return false;
      }
      return true;
    });
    const gutter = gutterFor(lines, page, options);
    if (gutter !== null) columnPages++;
    const ordered = readingOrder(lines, gutter);
    const font = median(ordered.map((l) => l.height)) || 10;
    const lineStep =
      median(
        lines
          .slice(1)
          .map((l, i) => l.y - lines[i].y)
          .filter((d) => d > font * 0.6 && d < font * 3),
      ) || font * 1.5;
    const blocks: {
      text: string;
      kind: Paragraph["kind"];
      first: Line;
      last: Line;
    }[] = [];
    for (const line of ordered) {
      const columnLines =
        gutter === null
          ? ordered
          : ordered.filter((l) => l.x < gutter === line.x < gutter);
      const long = columnLines.filter((l) => l.text.length > 40);
      const leftEdges = long
        .filter((l) => !l.dropCapBottom)
        .map((l) => l.x)
        .sort((a, b) => a - b);
      const left = leftEdges.length
        ? leftEdges[Math.floor((leftEdges.length - 1) * 0.2)]
        : Math.min(...columnLines.map((l) => l.x));
      const right = Math.max(...columnLines.map((l) => l.right));
      const uppercase =
        line.text.length < 100 &&
        /\p{Lu}/u.test(line.text) &&
        !/[a-zà-öø-ÿ]/.test(line.text);
      const heading =
        (line.height > font * 1.42 && line.text.length < 180) ||
        (uppercase && line.x > left + font * 1.3 && line.text.length < 90);
      const last = blocks.at(-1);
      const wrappedAroundCap =
        last?.first.dropCapBottom &&
        line.y <= last.first.dropCapBottom + font * 0.75;
      const indented =
        !wrappedAroundCap && line.x - left > Math.max(3, font * 0.5);
      const columnChange = last && line.y < last.last.y - lineStep;
      const gap = last ? line.y - last.last.y : 0;
      const shortEnding =
        last &&
        last.last.right < right - font * 3 &&
        /[.!?][”"')\]]?$/.test(last.text);
      if (
        heading &&
        last?.kind === "heading" &&
        gap > 0 &&
        gap <= lineStep * 1.25 &&
        Math.abs(line.x + line.right - (last.last.x + last.last.right)) <
          font * 6 &&
        Math.max(line.height, last.last.height) /
          Math.min(line.height, last.last.height) <
          1.3
      ) {
        last.text += " " + line.text;
        last.last = line;
        continue;
      }
      const start =
        !last ||
        heading ||
        last.kind === "heading" ||
        indented ||
        columnChange ||
        gap > lineStep * 1.65 ||
        shortEnding;
      if (start)
        blocks.push({
          text: line.text,
          kind: heading ? "heading" : "paragraph",
          first: line,
          last: line,
        });
      else {
        last.text = joinText(last.text, line.text, options);
        last.last = line;
      }
    }
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i],
        prior = paragraphs.at(-1);
      const continues =
        i === 0 &&
        previousCanContinue &&
        block.kind === "paragraph" &&
        prior?.kind === "paragraph" &&
        /^\p{Ll}/u.test(block.text) &&
        options.joinLines;
      if (continues) {
        prior.text = joinText(prior.text, block.text, options);
        prior.pageEnd = String(page.number);
      } else
        paragraphs.push({
          id: paragraphs.length + 1,
          text: block.text,
          page: String(page.number),
          kind: block.kind,
        });
    }
    const tail = blocks.at(-1);
    previousCanContinue =
      !!tail &&
      tail.kind === "paragraph" &&
      !/[.!?:][”"')\]]?$/.test(tail.text);
  }
  const warnings: string[] = [];
  if (emptyPages.length)
    warnings.push(
      `${emptyPages.length} página(s) sem texto selecionável. Imagens digitalizadas podem exigir OCR.`,
    );
  const text = paragraphs.map((p) => p.text).join("\n\n");
  if ((text.match(/�/g)?.length ?? 0) > Math.max(5, text.length * 0.003))
    warnings.push(
      "A camada de texto contém caracteres ilegíveis. Confira o arquivo original.",
    );
  const report: ExtractionReport = {
    engine: "layout-v2",
    options,
    warnings,
    emptyPages,
    removedHeaders,
    columnPages,
    chapterCount: paragraphs.filter((p) => p.kind === "heading").length,
    generatedAt: new Date().toISOString(),
  };
  return { paragraphs, text, report };
}
