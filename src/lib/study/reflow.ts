import type { Paragraph, Source, TextAnchor, VaultData } from "../vault/types";
import type { FileReadResult } from "./import";

// Keep an index back to original characters so a normalized match never corrupts selection offsets.
function indexed(text: string) {
  let value = "";
  const offsets: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (/[\u00ad\u200b\ufeff]/.test(text[i])) continue;
    const c = /\s/.test(text[i]) ? " " : text[i];
    if (c === " " && value.endsWith(" ")) continue;
    value += c;
    offsets.push(i);
  }
  return { value, offsets };
}
const normalized = (text: string) => indexed(text).value.trim();
export function reflowSource(
  data: VaultData,
  target: string,
  read: FileReadResult,
) {
  const source = data.sources.find((s) => s.id === target);
  if (!source) throw new Error("O material não está mais na biblioteca.");
  const incoming =
    read.paragraphs ??
    read.text
      .split(/\n\s*\n/)
      .filter((t) => t.trim())
      .map((text, i) => ({ id: i + 1, text }));
  if (!incoming.length)
    throw new Error(
      "Nenhum parágrafo legível foi encontrado. O texto atual foi preservado.",
    );
  let nextId = Math.max(0, ...source.paragraphs.map((p) => p.id));
  const oldByText = new Map<string, Paragraph[]>();
  for (const p of source.paragraphs) {
    const k = normalized(p.text);
    oldByText.set(k, [...(oldByText.get(k) ?? []), p]);
  }
  const newCounts = new Map<string, number>();
  for (const p of incoming) {
    const k = normalized(p.text);
    newCounts.set(k, (newCounts.get(k) ?? 0) + 1);
  }
  const stable = new Map<number, number>();
  const paragraphs: Paragraph[] = incoming.map((p) => {
    const key = normalized(p.text),
      old = oldByText.get(key);
    const id =
      old?.length === 1 && newCounts.get(key) === 1 ? old[0].id : ++nextId;
    if (old?.length === 1 && newCounts.get(key) === 1)
      stable.set(old[0].id, id);
    return { ...p, id };
  });
  const positions: {
    paragraph: Paragraph;
    start: number;
    end: number;
    index: ReturnType<typeof indexed>;
  }[] = [];
  let full = "";
  for (const paragraph of paragraphs) {
    const index = indexed(paragraph.text);
    if (full) full += " ";
    const start = full.length;
    full += index.value;
    positions.push({ paragraph, index, start, end: full.length });
  }
  function locate(quote: string, page?: string): TextAnchor[] | undefined {
    const needle = normalized(quote);
    if (!needle) return;
    let from = 0;
    const matches: number[] = [];
    while (from <= full.length) {
      const at = full.indexOf(needle, from);
      if (at < 0) break;
      matches.push(at);
      from = at + Math.max(1, needle.length);
      if (matches.length > 100) return;
    }
    const byPage = page
      ? matches.filter((at) =>
          positions.some(
            (p) => at >= p.start && at < p.end && p.paragraph.page === page,
          ),
        )
      : [];
    const candidates = byPage.length === 1 ? byPage : matches;
    if (candidates.length !== 1) return;
    const start = candidates[0],
      end = start + needle.length;
    return positions
      .filter((p) => p.end > start && p.start < end)
      .map((p) => {
        const a = Math.max(0, start - p.start),
          b = Math.min(p.index.value.length, end - p.start);
        const offset = p.index.offsets[a],
          finish = p.index.offsets[b - 1] + 1;
        return {
          paragraphId: p.paragraph.id,
          start: offset,
          end: finish,
          quote: p.paragraph.text.slice(offset, finish),
          page: p.paragraph.page,
        };
      });
  }
  let verified = 0,
    unmatched = 0;
  const stamp = new Date().toISOString();
  const marginNotes = data.marginNotes.map((mark) => {
    if (
      mark.sourceId !== target ||
      (!mark.paragraphId && !mark.quote && mark.anchorStatus !== "unmatched")
    )
      return mark;
    const quote =
      mark.quote ||
      mark.anchors?.map((a) => a.quote).join(" ") ||
      source.paragraphs.find((p) => p.id === mark.paragraphId)?.text;
    const anchors = quote ? locate(quote, mark.page) : undefined;
    if (anchors?.length) {
      verified++;
      return {
        ...mark,
        quote: mark.quote ?? quote,
        paragraphId: anchors[0].paragraphId,
        anchors,
        start: anchors[0].start,
        end: anchors[0].end,
        page: anchors[0].page,
        anchorStatus: "verified" as const,
        updatedAt: stamp,
      };
    }
    unmatched++;
    return {
      ...mark,
      quote: mark.quote ?? quote,
      paragraphId: 0,
      anchors: [],
      start: undefined,
      end: undefined,
      anchorStatus: "unmatched" as const,
      updatedAt: stamp,
    };
  });
  const notes = data.notes.map((note) => {
    if (
      note.fonte !== target ||
      (!note.paragraphId && !note.quote && note.anchorStatus !== "unmatched")
    )
      return note;
    const linked = marginNotes.find((m) => m.noteId === note.id);
    const anchors = note.quote ? locate(note.quote) : undefined;
    const paragraphId = linked
      ? linked.paragraphId
      : anchors?.[0]?.paragraphId || stable.get(note.paragraphId ?? 0);
    if (!linked) {
      if (paragraphId) verified++;
      else unmatched++;
    }
    return {
      ...note,
      paragraphId: paragraphId ?? 0,
      anchorStatus: paragraphId
        ? ("verified" as const)
        : ("unmatched" as const),
      updatedAt: stamp,
    };
  });
  const cards = data.cards.map((card) => {
    if (card.fonte !== target || !card.paragraphId) return card;
    const linked = notes.find((n) => n.id === card.noteId),
      paragraphId = linked?.paragraphId || stable.get(card.paragraphId);
    if (paragraphId) verified++;
    else unmatched++;
    return {
      ...card,
      paragraphId: paragraphId ?? 0,
      anchorStatus: paragraphId
        ? ("verified" as const)
        : ("unmatched" as const),
      updatedAt: stamp,
    };
  });
  const oldPosition = source.paragraphs.find(
    (p) => p.id === source.lastParagraph,
  );
  const lastParagraph =
    stable.get(source.lastParagraph ?? 0) ??
    paragraphs.find((p) => p.page && p.page === oldPosition?.page)?.id ??
    paragraphs[0].id;
  const updated: Source = {
    ...source,
    paragraphs,
    pages: read.pages,
    format: read.format,
    extraction: read.report,
    overview: undefined,
    briefSummary: "",
    claims: [],
    lastParagraph,
    contentRevision: (source.contentRevision ?? 0) + 1,
    readTime: `${Math.max(1, Math.ceil(read.text.split(/\s+/).length / 220))} min`,
    updatedAt: stamp,
  };
  return {
    sources: data.sources.map((s) => (s.id === target ? updated : s)),
    notes,
    cards,
    marginNotes,
    stats: { verified, unmatched },
  };
}
