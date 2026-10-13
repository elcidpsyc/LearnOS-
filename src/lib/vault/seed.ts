import original from "../../data/psychology-seed.json";
import github from "../../data/github-seed.json";
import { DEFAULT_SETTINGS } from "./model";
import type {
  VaultData,
  Source,
  Note,
  Card,
  MarginNote,
  Relation,
} from "./types";
const stamp = "2026-09-13T12:00:00.000Z";
const palette = [
  "#716297",
  "#837852",
  "#536f72",
  "#b4775d",
  "#4e647c",
  "#727b55",
  "#956060",
  "#69627f",
];
export function psychologyData(): Pick<
  VaultData,
  "sources" | "notes" | "cards" | "relations" | "profile"
> {
  const sources: Source[] = original.sources.map((s, i) => {
    const notes = original.notes.filter((n) => n.fonte === s.id);
    const paragraphs = notes
      .filter((n) => n.quote?.text)
      .map((n, j) => ({
        id: j + 1,
        text: n.quote.text,
        page: n.quote.pagina,
        firstLetterDrop: j === 0,
      }));
    return {
      id: s.id,
      title: s.obra,
      author: s.autor,
      topic: "Psicologia",
      readTime: `${Math.max(
        1,
        Math.ceil(
          paragraphs
            .map((p) => p.text)
            .join(" ")
            .split(/\s+/).length / 220,
        ),
      )} min`,
      pages: s.paginasArquivo ?? 0,
      publishedYear: String(s.ano),
      progress: 0,
      briefSummary:
        "Recortes e notas do estudo original. As afirmações históricas são registradas como claims da fonte.",
      claims: [],
      paragraphs,
      spineColor: palette[i],
      spineTextColor: "#f9f5ed",
      spineHeight: 192 + i * 9,
      spineWidth: 38 + i * 4,
      format: s.arquivo?.endsWith(".epub") ? "EPUB" : "PDF",
      origin: "catalog",
      excerptOnly: true,
      createdAt: stamp,
      updatedAt: stamp,
    };
  });
  const notes: Note[] = original.notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.claims.join("\n"),
    fonte: n.fonte,
    paginas: n.paginas,
    tags: ["Psicologia", n.tema],
    createdAt: stamp,
    updatedAt: stamp,
    claims: n.claims,
    commentary: n.comentario,
    questions: n.perguntasAbertas,
    citation: n.citacao,
    quote: n.quote?.text,
    paragraphId: sources
      .find((s) => s.id === n.fonte)
      ?.paragraphs.find((p) => p.text === n.quote?.text)?.id,
  }));
  const cards: Card[] = original.cards.map((c) => ({
    id: c.id,
    frente: c.q,
    verso: c.gabarito,
    proxima: c.proxima,
    qualidade: c.qualidade,
    revisoes: 0,
    fonte: c.fonte,
    tags: ["Psicologia", c.tema],
    noteId: c.noteIds[0],
    location: c.paginas,
    interval: 1,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  const relations: Relation[] = [];
  for (const n of original.notes)
    for (const [kind, ids] of Object.entries(n.ligacoes))
      for (const target of ids) {
        const k =
          kind === "preRequisito"
            ? "pre-requisito"
            : (kind as Relation["kind"]);
        if (
          !relations.some(
            (r) => r.from === n.id && r.to === target && r.kind === k,
          )
        )
          relations.push({
            id: `${n.id}-${k}-${target}`,
            from: n.id,
            to: target,
            kind: k,
            reason: "Relação preservada do estudo original.",
            citation: n.citacao,
            createdAt: stamp,
            updatedAt: stamp,
          });
      }
  return { sources, notes, cards, relations, profile: original.profile };
}
export function freshVault(): VaultData {
  const psychology = psychologyData();
  const sources: Source[] = github.sources.map(
    (s, i) =>
      ({
        ...s,
        topic:
          s.topic === "AI"
            ? "Inteligência artificial"
            : s.topic === "Work & careers"
              ? "Trabalho e pesquisa"
              : s.topic === "Writing"
                ? "Escrita"
                : s.topic,
        origin: "example",
        format: "Texto",
        excerptOnly: true,
        progress: 0,
        pages: 0,
        readTime: `${Math.max(
          1,
          Math.ceil(
            s.paragraphs
              .map((p) => p.text)
              .join(" ")
              .split(/\s+/).length / 220,
          ),
        )} min`,
        spineColor: palette[i + 3],
        createdAt: stamp,
        updatedAt: stamp,
      }) as Source,
  );
  const notes: Note[] = github.notes.map((n) => ({
    ...n,
    paginas: String(n.paginas),
    claims: [n.content],
    commentary: [],
    questions: [],
    citation: `${sources.find((s) => s.id === n.fonte)?.author}. ${sources.find((s) => s.id === n.fonte)?.title}, ${n.paginas}. Nota de demonstração.`,
    updatedAt: stamp,
  }));
  const cards: Card[] = github.cards.map((c) => ({
    ...c,
    interval: 1,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  const margins: MarginNote[] = github.marginNotes.map((n) => ({
    ...n,
    type: n.type as MarginNote["type"],
    createdAt: stamp,
    updatedAt: stamp,
  }));
  return {
    version: 2,
    sources: [...psychology.sources, ...sources],
    notes: [...psychology.notes, ...notes],
    cards: [...psychology.cards, ...cards],
    marginNotes: margins,
    relations: psychology.relations,
    reviews: [],
    settings: { ...DEFAULT_SETTINGS },
    activeSourceId: "iyer-1926",
    updatedAt: stamp,
    tombstones: [],
    profile: psychology.profile,
  };
}
