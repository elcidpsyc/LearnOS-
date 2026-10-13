import test from "node:test";
import assert from "node:assert/strict";
import { freshVault } from "../src/lib/vault/seed";
import { migrateVault } from "../src/lib/vault/migrate";
import {
  isDue,
  nextReview,
  mergeVault,
  vaultSchema,
} from "../src/lib/vault/model";
import { isPublicAddress } from "../server/safe-fetch";
test("a consolidação preserva as fontes e as notas originais", () => {
  const data = freshVault();
  assert.equal(vaultSchema.safeParse(data).success, true);
  for (const id of ["iyer-1926", "kidd-1919", "vidal-2011"])
    assert.ok(data.sources.some((s) => s.id === id));
  assert.ok(
    data.notes.some(
      (n) =>
        n.id === "iyer-preface-visao" &&
        n.claims.length &&
        n.commentary.length &&
        n.citation,
    ),
  );
});
test("a migração mantém conteúdo pessoal de ambos os formatos antigos", () => {
  const raw = {
    sources: [
      {
        id: "my-source",
        obra: "Minha obra",
        autor: "Autora",
        localBlob: true,
        arquivo: "livro.pdf",
      },
    ],
    notes: [
      {
        id: "my-note",
        title: "Minha nota",
        fonte: "my-source",
        claims: ["Afirmação original"],
        comentario: ["Meu comentário"],
        citacao: "Autora, p. 12",
        paginas: "12",
      },
    ],
    cards: [],
    marks: [],
  };
  const data = migrateVault(raw);
  assert.equal(
    data.notes.find((n) => n.id === "my-note")?.claims[0],
    "Afirmação original",
  );
  assert.equal(
    data.sources.find((s) => s.id === "my-source")?.fileId,
    "my-source",
  );
  const github = migrateVault({
    sources: [
      {
        id: "s",
        title: "Fonte pessoal",
        author: "Michel",
        paragraphs: [{ id: 1, text: "Texto preservado" }],
      },
    ],
    notes: [
      {
        id: "n",
        title: "Nota pessoal",
        content: "Meu texto",
        fonte: "s",
        paginas: "1",
        tags: [],
      },
    ],
    cards: [],
    marginNotes: [],
  });
  assert.equal(github.notes.find((n) => n.id === "n")?.content, "Meu texto");
  assert.equal(
    github.sources.find((s) => s.id === "s")?.paragraphs[0].text,
    "Texto preservado",
  );
});
test("cartões avaliados como fáceis voltam quando a data chega", () => {
  const card = {
    ...freshVault().cards[0],
    qualidade: 5,
    proxima: "2026-10-12",
  };
  assert.equal(isDue(card, new Date(2026, 9, 13)), true);
  const schedule = nextReview(
    { ...card, interval: 1 },
    3,
    new Date(2026, 9, 12),
  );
  assert.equal(schedule.proxima, "2026-10-16");
  assert.equal(schedule.interval, 4);
});
test("sincronização reúne alterações e respeita remoções", () => {
  const a = freshVault(),
    b = freshVault();
  a.notes[0] = {
    ...a.notes[0],
    content: "Edição neste celular",
    updatedAt: "2026-10-12T13:00:00Z",
  };
  b.notes[1] = {
    ...b.notes[1],
    content: "Edição no tablet",
    updatedAt: "2026-10-12T14:00:00Z",
  };
  a.tombstones = [
    { id: a.notes[2].id, collection: "notes", at: "2026-10-12T15:00:00Z" },
  ];
  const merged = mergeVault(a, b);
  assert.equal(
    merged.notes.find((n) => n.id === a.notes[0].id)?.content,
    "Edição neste celular",
  );
  assert.equal(
    merged.notes.find((n) => n.id === b.notes[1].id)?.content,
    "Edição no tablet",
  );
  assert.equal(
    merged.notes.some((n) => n.id === a.notes[2].id),
    false,
  );
});
test("ingestão de links rejeita endereços internos, loopback e reservados", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.5",
    "169.254.169.254",
    "192.168.1.1",
    "172.16.0.2",
    "::1",
    "fc00::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("1.1.1.1"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});
