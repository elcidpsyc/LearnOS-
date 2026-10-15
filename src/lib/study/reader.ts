import type {
  Source,
  MarginNote,
  Note,
  TextAnchor,
  Selection,
  VaultData,
  Paragraph,
} from "../vault/types";

export const HIGHLIGHT_COLORS = ["#efcf69", "#aac993", "#a1c8da", "#dba0b4"];
export const HIGHLIGHT_NAMES = ["Amarelo", "Verde", "Azul", "Rosa"];
export function safeUrl(value?: string): string | undefined {
  try {
    const url = new URL(value ?? "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function anchorsFor(
  mark: Pick<MarginNote, "anchors" | "paragraphId" | "start" | "end" | "quote">,
  source: Source,
  paragraphs = new Map(source.paragraphs.map((p) => [p.id, p])),
): TextAnchor[] {
  const anchors =
    mark.anchors ??
    (() => {
      const paragraph = paragraphs.get(mark.paragraphId);
      if (!paragraph || !mark.quote) return [];
      const start = mark.start ?? paragraph.text.indexOf(mark.quote);
      return [
        {
          paragraphId: mark.paragraphId,
          start,
          end: mark.end ?? start + mark.quote.length,
          quote: mark.quote,
        },
      ];
    })();
  return anchors.filter((a) => {
    const p = paragraphs.get(a.paragraphId);
    return (
      p &&
      a.start >= 0 &&
      a.end > a.start &&
      a.end <= p.text.length &&
      p.text.slice(a.start, a.end) === a.quote
    );
  });
}
type HighlightSpan = TextAnchor & { mark: MarginNote };
function runsForParagraph(paragraph: Paragraph, spans: HighlightSpan[]) {
  const text = paragraph.text;
  const points = [
    ...new Set([0, text.length, ...spans.flatMap((s) => [s.start, s.end])]),
  ].sort((a, b) => a - b);
  return points.slice(0, -1).map((start, i) => {
    const end = points[i + 1];
    const active = spans
      .filter((s) => s.start <= start && s.end >= end)
      .sort((a, b) => b.mark.updatedAt.localeCompare(a.mark.updatedAt))[0];
    return { start, end, text: text.slice(start, end), mark: active?.mark };
  });
}
export function buildHighlightRuns(source: Source, marks: MarginNote[]) {
  const paragraphs = new Map(source.paragraphs.map((p) => [p.id, p]));
  const spans = new Map<number, HighlightSpan[]>();
  for (const mark of marks) {
    if (mark.type !== "highlight") continue;
    for (const anchor of anchorsFor(mark, source, paragraphs)) {
      const group = spans.get(anchor.paragraphId) ?? [];
      group.push({ ...anchor, mark });
      spans.set(anchor.paragraphId, group);
    }
  }
  return new Map(
    [...spans].map(([id, group]) => [
      id,
      runsForParagraph(paragraphs.get(id)!, group),
    ]),
  );
}
export function highlightRuns(
  source: Source,
  paragraphId: number,
  marks: MarginNote[],
) {
  const paragraph = source.paragraphs.find((p) => p.id === paragraphId);
  return (
    buildHighlightRuns(source, marks).get(paragraphId) ??
    (paragraph ? runsForParagraph(paragraph, []) : [])
  );
}
export function captureReadingSelection(
  root: HTMLElement,
  source: Source,
): Selection | null {
  const selected = window.getSelection();
  if (!selected || selected.isCollapsed || !selected.rangeCount) return null;
  const range = selected.getRangeAt(0);
  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  )
    return null;
  const anchors: TextAnchor[] = [];
  for (const node of root.querySelectorAll<HTMLElement>("[data-reader-text]")) {
    if (!range.intersectsNode(node)) continue;
    const part = document.createRange();
    part.selectNodeContents(node);
    if (node.contains(range.startContainer))
      part.setStart(range.startContainer, range.startOffset);
    if (node.contains(range.endContainer))
      part.setEnd(range.endContainer, range.endOffset);
    const raw = part.toString();
    const quote = raw.trim();
    if (!quote) continue;
    const prefix = document.createRange();
    prefix.selectNodeContents(node);
    prefix.setEnd(part.startContainer, part.startOffset);
    const start =
      prefix.toString().length + raw.length - raw.trimStart().length;
    const paragraphId = Number(node.dataset.readerText);
    anchors.push({
      paragraphId,
      start,
      end: start + quote.length,
      quote,
      page: source.paragraphs.find((p) => p.id === paragraphId)?.page,
    });
  }
  if (!anchors.length) return null;
  const rect = range.getBoundingClientRect();
  return {
    sourceId: source.id,
    paragraphId: anchors[0].paragraphId,
    text: anchors.map((a) => a.quote).join("\n\n"),
    start: anchors[0].start,
    end: anchors[0].end,
    page: anchors[0].page,
    anchors,
    left: rect.left,
    top: rect.bottom,
  };
}
export function readingContext(
  source: Source,
  anchorIds: number[] = [],
  limit = 78000,
) {
  const paragraphs = source.paragraphs.map((p) => ({
    id: p.id,
    content: `[¶${p.id}]${p.page ? ` (p. ${p.page})` : ""} ${p.text}`,
  }));
  const all = paragraphs.map((p) => p.content).join("\n\n");
  if (all.length <= limit) return { text: all, partial: false };
  const chosen = new Map<number, string>();
  let remaining = limit - 120;
  const put = (i: number) => {
    const p = paragraphs[i];
    if (!p || chosen.has(i) || remaining < 50) return;
    const part = p.content.slice(0, remaining);
    chosen.set(i, part);
    remaining -= part.length + 2;
  };
  // The selected passage and its neighbours precede the rest in the budget.
  for (const id of anchorIds) {
    const index = paragraphs.findIndex((p) => p.id === id);
    put(index);
    put(index - 1);
    put(index + 1);
  }
  if (anchorIds.length) {
    for (let i = 0; i < paragraphs.length && remaining > 50; i++) put(i);
  } else {
    // Sample the whole document for an overview, clearly labelled as partial.
    const count = Math.min(80, paragraphs.length);
    const budget = Math.floor(remaining / count) - 2;
    for (let i = 0; i < count; i++) {
      const index = Math.floor(
        (i * (paragraphs.length - 1)) / Math.max(1, count - 1),
      );
      chosen.set(index, paragraphs[index].content.slice(0, budget));
    }
  }
  return {
    text:
      "CONTEXTO PARCIAL: somente os parágrafos abaixo foram fornecidos. Não atribua informações às partes omitidas.\n\n" +
      [...chosen.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, v]) => v)
        .join("\n\n"),
    partial: true,
  };
}
export type NotebookEntry = {
  anchorStatus?: "verified" | "unmatched";
  id: string;
  kind: "highlight" | "question" | "note";
  title: string;
  content: string;
  quote?: string;
  paragraphId?: number;
  mark?: MarginNote;
  note?: Note;
  date: string;
};
export function notebookEntries(
  sourceId: string,
  marks: MarginNote[],
  notes: Note[],
): NotebookEntry[] {
  const ownMarks = marks.filter((m) => m.sourceId === sourceId);
  const linked = new Set(ownMarks.map((m) => m.noteId).filter(Boolean));
  return [
    ...ownMarks.map((m) => ({
      id: m.id,
      kind:
        m.type === "highlight"
          ? ("highlight" as const)
          : ["qa", "question", "explain"].includes(m.type)
            ? ("question" as const)
            : ("note" as const),
      title: m.title,
      content: m.content,
      quote: m.quote,
      paragraphId: m.paragraphId,
      anchorStatus: m.anchorStatus,
      mark: m,
      date: m.createdAt,
    })),
    ...notes
      .filter((n) => n.fonte === sourceId && !linked.has(n.id))
      .map((n) => ({
        id: n.id,
        kind: "note" as const,
        title: n.title,
        content: n.content,
        quote: n.quote,
        paragraphId: n.paragraphId,
        anchorStatus: n.anchorStatus,
        note: n,
        date: n.createdAt,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
export function notebookMarkdown(
  source: Source,
  marks: MarginNote[],
  notes: Note[],
) {
  const entries = notebookEntries(source.id, marks, notes);
  const lines = [
    `# ${source.title}`,
    "",
    `${source.author}${source.url ? ` · ${source.url}` : ""}`,
    "",
    "Caderno LearnOS",
    "",
  ];
  for (const entry of entries) {
    lines.push(
      `## ${entry.kind === "highlight" ? "Destaque" : entry.title}`,
      "",
      entry.anchorStatus === "unmatched"
        ? "Referência: trecho da versão anterior (conferir)"
        : entry.paragraphId
          ? `Referência: ¶${entry.paragraphId}${entry.mark?.anchors?.length ? `–¶${entry.mark.anchors.at(-1)!.paragraphId}` : ""}`
          : "Referência: material inteiro",
      "",
    );
    if (entry.quote)
      lines.push(...entry.quote.split("\n").map((line) => `> ${line}`), "");
    if (entry.mark?.conversation?.length)
      for (const turn of entry.mark.conversation) {
        lines.push(
          `**${turn.role === "user" ? "Você" : "LearnOS"}:** ${turn.content}`,
          "",
        );
        for (const ref of turn.references ?? [])
          if (safeUrl(ref.url)) lines.push(`- [${ref.title}](${ref.url})`);
      }
    else if (entry.content) lines.push(entry.content, "");
  }
  return lines.join("\n");
}
export async function exportNotebooks(data: VaultData) {
  const JSZip = (await import("jszip")).default;
  const { download } = await import("../vault/files");
  const zip = new JSZip();
  for (const source of data.sources) {
    const name =
      source.title.replace(/[\\/:*?"<>|\n\r]/g, "-").slice(0, 100) ||
      "Material";
    zip.file(
      `${name}-${source.id.slice(0, 8)}.md`,
      notebookMarkdown(source, data.marginNotes, data.notes),
    );
  }
  download(await zip.generateAsync({ type: "blob" }), "LearnOS-cadernos.zip");
}
