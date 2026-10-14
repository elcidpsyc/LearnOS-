import test from "node:test";
import assert from "node:assert/strict";
import { freshVault } from "../src/lib/vault/seed";
import { vaultSchema, mergeVault } from "../src/lib/vault/model";
import {
  anchorsFor,
  highlightRuns,
  notebookEntries,
  notebookMarkdown,
  readingContext,
  safeUrl,
} from "../src/lib/study/reader";
import { parseBookmarkText } from "../src/lib/study/bookmarks";
import type { MarginNote, Source } from "../src/lib/vault/types";

const source: Source = {
  ...freshVault().sources[0],
  id: "reader-test",
  title: "Material de teste",
  paragraphs: [
    { id: 1, text: "Uma ideia preservada." },
    { id: 2, text: "Outra ideia em contexto." },
  ],
};
const mark: MarginNote = {
  id: "mark-test",
  sourceId: source.id,
  paragraphId: 1,
  type: "highlight",
  title: "Trecho",
  content: "",
  quote: "ideia preservada.\n\nOutra ideia",
  start: 4,
  end: 21,
  anchors: [
    { paragraphId: 1, start: 4, end: 21, quote: "ideia preservada." },
    { paragraphId: 2, start: 0, end: 11, quote: "Outra ideia" },
  ],
  createdAt: "2026-10-14",
  updatedAt: "2026-10-14",
};
test("destaques em vários parágrafos preservam offsets, texto e sobreposições", () => {
  assert.equal(anchorsFor(mark, source).length, 2);
  const overlap = {
    ...mark,
    id: "overlap",
    anchors: [{ paragraphId: 1, start: 4, end: 9, quote: "ideia" }],
    updatedAt: "2026-10-15",
  };
  const runs = highlightRuns(source, 1, [mark, overlap]);
  assert.equal(runs.map((r) => r.text).join(""), source.paragraphs[0].text);
  assert.equal(runs.find((r) => r.text === "ideia")?.mark?.id, "overlap");
  assert.equal(
    highlightRuns(source, 2, [mark])
      .filter((r) => r.mark)
      .map((r) => r.text)
      .join(""),
    "Outra ideia",
  );
});
test("âncoras antigas ou incompatíveis não destacam uma ocorrência diferente", () => {
  assert.equal(
    anchorsFor(
      {
        ...mark,
        anchors: [{ paragraphId: 1, start: 0, end: 5, quote: "outro" }],
      },
      source,
    ).length,
    0,
  );
  const legacy = {
    ...mark,
    anchors: undefined,
    quote: "ideia",
    start: undefined,
    end: undefined,
  };
  assert.equal(anchorsFor(legacy, source)[0].start, 4);
});
test("backup antigo recebe novos padrões e o novo backup preserva conversas e organização", () => {
  const old: any = freshVault();
  for (const field of [
    "minimap",
    "answerLength",
    "answerDepth",
    "webSearch",
    "speechRate",
  ])
    delete old.settings[field];
  const migrated = vaultSchema.parse(old);
  assert.equal(migrated.settings.minimap, true);
  assert.equal(migrated.settings.webSearch, false);
  const v = freshVault();
  v.sources = [{ ...source, folder: "Psicologia", tags: ["História"] }];
  v.marginNotes = [
    {
      ...mark,
      type: "qa",
      conversation: [
        { role: "user", content: "Como?", createdAt: "2026-10-14" },
        {
          role: "assistant",
          content: "Resposta [¶1]",
          createdAt: "2026-10-14",
        },
      ],
    },
  ];
  const restored = vaultSchema.parse(JSON.parse(JSON.stringify(v)));
  assert.equal(restored.sources[0].folder, "Psicologia");
  assert.equal(restored.marginNotes[0].conversation?.length, 2);
  assert.equal(restored.marginNotes[0].anchors?.length, 2);
});
test("caderno inclui perguntas de margem sem duplicar notas vinculadas", () => {
  const data = freshVault();
  const note = { ...data.notes[0], id: "linked", fonte: source.id };
  const qa = {
    ...mark,
    type: "qa" as const,
    noteId: "linked",
    conversation: [
      {
        role: "user" as const,
        content: "Pergunta original",
        createdAt: "2026-10-14",
      },
      {
        role: "assistant" as const,
        content: "Resposta com referência [¶1]",
        createdAt: "2026-10-14",
      },
    ],
  };
  assert.equal(notebookEntries(source.id, [qa], [note]).length, 1);
  const exported = notebookMarkdown(source, [qa], [note]);
  assert.match(exported, /Pergunta original/);
  assert.match(exported, /Resposta com referência/);
  assert.match(exported, /¶1–¶2/);
});
test("contexto de livros grandes mantém a seleção e sinaliza cobertura parcial", () => {
  const big = {
    ...source,
    paragraphs: Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      text: `Parágrafo ${i + 1}: ` + "conteúdo ".repeat(200),
    })),
  };
  const context = readingContext(big, [50], 5000);
  assert.equal(context.partial, true);
  assert.match(context.text, /\[¶50\]/);
  assert.match(context.text, /CONTEXTO PARCIAL/);
  assert.ok(context.text.length <= 5000);
  const overview = readingContext(big, [], 5000);
  assert.match(overview.text, /\[¶60\]/);
  assert.ok(overview.text.length <= 5000);
});
test("importação aceita exports HTML, CSV e JSON, deduplica e recusa URLs executáveis", () => {
  assert.deepEqual(
    parseBookmarkText(
      '<a href="https://example.com/a?x=1&amp;y=2">Um &amp; dois</a><a href="javascript:alert(1)">Inválido</a>',
    ),
    [{ url: "https://example.com/a?x=1&y=2", title: "Um & dois" }],
  );
  assert.equal(
    parseBookmarkText(
      'title,url\n"Texto, com vírgula",https://example.com/a\nDuplicado,https://example.com/a#trecho',
    ).length,
    1,
  );
  assert.equal(
    parseBookmarkText(
      JSON.stringify({
        items: [{ title: "Título", link: "https://example.com" }],
      }),
    )[0].title,
    "Título",
  );
  assert.equal(
    parseBookmarkText("https://user:secret@example.com\nfile:///etc/passwd")
      .length,
    0,
  );
});
test("URLs renderizadas não executam scripts ou data URLs", () => {
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("data:text/html,abc"), undefined);
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
});
test("sincronização preserva a conversa mais recente e respeita exclusões", () => {
  const local = freshVault();
  const remote = freshVault();
  local.marginNotes = [mark];
  remote.marginNotes = [
    { ...mark, content: "nova conversa", updatedAt: "2026-10-15" },
  ];
  assert.equal(
    mergeVault(local, remote).marginNotes.find((m) => m.id === mark.id)
      ?.content,
    "nova conversa",
  );
  local.tombstones.push({
    id: mark.id,
    collection: "marginNotes",
    at: "2026-10-16",
  });
  assert.ok(
    !mergeVault(local, remote).marginNotes.some((m) => m.id === mark.id),
  );
});
