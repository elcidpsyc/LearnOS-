import type { Paragraph } from "../vault/types";
export type PreviewSheet = {
  label: string;
  page?: number;
  lastPage?: number;
  paragraphs: Paragraph[];
};
export function previewSheets(paragraphs: Paragraph[]): PreviewSheet[] {
  const sheets: PreviewSheet[] = [];
  for (const paragraph of paragraphs) {
    const page =
      paragraph.page && /^\d+$/.test(paragraph.page)
        ? Number(paragraph.page)
        : undefined;
    const last = sheets.at(-1);
    const label = page
      ? `Página ${page}`
      : paragraph.section || "Texto do material";
    const same =
      last &&
      (page
        ? last.page === page
        : last.label === label && last.paragraphs.length < 12);
    if (same) {
      last.paragraphs.push(paragraph);
      if (page)
        last.lastPage = Math.max(
          last.lastPage ?? page,
          Number(paragraph.pageEnd) || page,
        );
    } else
      sheets.push({
        label,
        page,
        lastPage: page ? Number(paragraph.pageEnd) || page : undefined,
        paragraphs: [paragraph],
      });
  }
  return sheets;
}
export function sheetForPage(sheets: PreviewSheet[], page: number) {
  const exact = sheets.findIndex(
    (s) =>
      s.page !== undefined && s.page <= page && (s.lastPage ?? s.page) >= page,
  );
  if (exact >= 0) return exact;
  const next = sheets.findIndex((s) => s.page !== undefined && s.page >= page);
  return next >= 0 ? next : Math.max(0, sheets.length - 1);
}
export function editPreview(
  paragraphs: Paragraph[],
  id: number,
  action:
    | { type: "replace"; text: string; kind: Paragraph["kind"] }
    | { type: "omit" }
    | { type: "merge" },
): Paragraph[] {
  const at = paragraphs.findIndex((p) => p.id === id);
  if (at < 0) return paragraphs;
  if (action.type === "replace")
    return paragraphs.map((p) =>
      p.id === id ? { ...p, text: action.text.trim(), kind: action.kind } : p,
    );
  if (action.type === "omit") return paragraphs.filter((p) => p.id !== id);
  const current = paragraphs[at],
    next = paragraphs[at + 1];
  if (!next || current.page !== next.page || current.section !== next.section)
    return paragraphs;
  return paragraphs.flatMap((p, i) =>
    i === at
      ? [
          {
            ...p,
            text: `${p.text.trim()} ${next.text.trim()}`,
            pageEnd: next.pageEnd ?? p.pageEnd,
          },
        ]
      : i === at + 1
        ? []
        : [p],
  );
}
