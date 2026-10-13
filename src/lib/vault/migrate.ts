import type { VaultData, Source, Note, Card, MarginNote } from "./types";
import { freshVault, psychologyData } from "./seed";
import { DEFAULT_SETTINGS, vaultSchema } from "./model";
type Legacy = Record<string, any>;
export function migrateVault(input: unknown): VaultData {
  if (!input || typeof input !== "object") throw new Error("Backup inválido.");
  const raw = input as Legacy;
  if (raw.version === 2) return vaultSchema.parse(raw) as VaultData;
  if (
    !Array.isArray(raw.sources) ||
    !Array.isArray(raw.notes) ||
    !Array.isArray(raw.cards)
  )
    throw new Error("O arquivo não contém fontes, notas e cartões.");
  const base = freshVault();
  const stamp = new Date().toISOString();
  const sources: Source[] = raw.sources.map((s: Legacy, i: number) => ({
    id: String(s.id),
    title: s.title ?? s.obra ?? "Sem título",
    author: s.author ?? s.autor ?? "Autor não informado",
    topic: s.topic ?? "Psicologia",
    readTime: s.readTime ?? "1 min",
    pages: s.pages ?? s.paginasArquivo ?? 0,
    publishedYear: String(s.publishedYear ?? s.ano ?? ""),
    progress: s.progress ?? 0,
    briefSummary: s.briefSummary ?? "",
    claims: s.claims ?? [],
    paragraphs:
      s.paragraphs ??
      (s.text
        ? [{ id: 1, text: s.text }]
        : raw.notes
            .filter((n: Legacy) => n.fonte === s.id && n.quote?.text)
            .map((n: Legacy, j: number) => ({
              id: j + 1,
              text: n.quote.text,
              page: n.quote.pagina,
            }))),
    spineColor: s.spineColor ?? ["#716297", "#837852", "#536f72"][i % 3],
    spineTextColor: s.spineTextColor ?? "#f9f5ed",
    spineHeight: s.spineHeight ?? 190,
    spineWidth: s.spineWidth ?? 38,
    url: s.url,
    format:
      s.format ??
      s.mime ??
      s.arquivo?.split(".").at(-1)?.toUpperCase() ??
      "Texto",
    origin: s.origin ?? (s.localBlob ? "file" : "manual"),
    fileId: s.fileId ?? (s.localBlob ? s.id : undefined),
    fileName: s.fileName ?? s.arquivo,
    mime: s.mime,
    size: s.size,
    excerptOnly: s.excerptOnly ?? !s.localBlob,
    createdAt: s.createdAt ?? stamp,
    updatedAt: s.updatedAt ?? stamp,
    lastReadAt: s.lastReadAt,
    lastParagraph: s.lastParagraph,
    agentName: s.agentName,
  }));
  const notes: Note[] = raw.notes.map((n: Legacy) => ({
    id: String(n.id),
    title: n.title ?? "Nota",
    content: n.content ?? n.claims?.join("\n") ?? "",
    fonte: n.fonte ?? n.sourceId ?? "",
    paginas: String(n.paginas ?? n.quote?.pagina ?? ""),
    tags: n.tags ?? [n.tema ?? "Estudo"],
    createdAt: n.createdAt ?? n.data ?? stamp,
    updatedAt: n.updatedAt ?? stamp,
    claims: n.claims ?? (n.content ? [n.content] : []),
    commentary: n.commentary ?? n.comentario ?? [],
    questions: n.questions ?? n.perguntasAbertas ?? [],
    citation: n.citation ?? n.citacao ?? "",
    quote: typeof n.quote === "string" ? n.quote : n.quote?.text,
    paragraphId: n.paragraphId,
    highlights: n.highlights,
  }));
  const cards: Card[] = raw.cards.map((c: Legacy) => ({
    id: String(c.id),
    frente: c.frente ?? c.q ?? "",
    verso: c.verso ?? c.gabarito ?? "",
    proxima: c.proxima ?? stamp.slice(0, 10),
    qualidade: c.qualidade ?? 1,
    revisoes: c.revisoes ?? 0,
    fonte: c.fonte ?? "",
    tags: c.tags ?? [c.tema ?? "Estudo"],
    noteId: c.noteId ?? c.noteIds?.[0],
    location: c.location ?? c.paginas,
    learnerAnswer: c.learnerAnswer,
    interval: c.interval ?? 1,
    createdAt: c.createdAt ?? stamp,
    updatedAt: c.updatedAt ?? stamp,
  }));
  const marginNotes: MarginNote[] = (raw.marginNotes ?? raw.marks ?? []).map(
    (m: Legacy) => ({
      id: String(m.id),
      sourceId: m.sourceId,
      paragraphId: m.paragraphId ?? 1,
      quote: m.quote ?? m.text,
      type:
        m.type ??
        (m.kind === "destaque"
          ? "highlight"
          : m.kind === "pergunta"
            ? "question"
            : m.kind === "lembrete"
              ? "reminder"
              : "note"),
      title: m.title ?? m.text?.slice(0, 64) ?? "Anotação",
      content: m.content ?? m.text ?? "",
      createdAt: m.createdAt ?? stamp,
      updatedAt: m.updatedAt ?? stamp,
      page: m.page,
      reminder: m.reminder,
      start: m.start,
      end: m.end,
      color: m.color,
    }),
  );
  const psych = psychologyData();
  const appendMissing = <T extends { id: string }>(a: T[], b: T[]) => [
    ...a,
    ...b.filter((n) => !a.some((m) => m.id === n.id)),
  ];
  return vaultSchema.parse({
    ...base,
    sources: appendMissing(sources, psych.sources),
    notes: appendMissing(notes, psych.notes),
    cards: appendMissing(cards, psych.cards),
    marginNotes,
    activeSourceId: raw.activeSourceId ?? sources[0]?.id ?? base.activeSourceId,
    profile: raw.profile ?? psych.profile,
    settings: {
      ...DEFAULT_SETTINGS,
      displayName: raw.settings?.displayName ?? DEFAULT_SETTINGS.displayName,
    },
    updatedAt: stamp,
  }) as VaultData;
}
