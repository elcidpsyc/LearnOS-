import test from "node:test";
import assert from "node:assert/strict";
import {
  previewSheets,
  sheetForPage,
  editPreview,
} from "../src/lib/study/document-preview";
import { selectionPosition } from "../src/lib/study/selection-position";
import { assist, WORKSPACE_REQUIRED_MESSAGE } from "../src/lib/study/ai";

test("prévia reúne uma página, mantém intervalos e salta páginas sem texto", () => {
  const p = [
    { id: 1, text: "THE", kind: "heading" as const, page: "7" },
    { id: 2, text: "SCIENCE OF POWER", kind: "heading" as const, page: "7" },
    {
      id: 3,
      text: "Argumento que atravessa a página.",
      page: "15",
      pageEnd: "16",
    },
    { id: 4, text: "Continuação.", page: "17" },
  ];
  const sheets = previewSheets(p);
  assert.equal(sheets.length, 3);
  assert.equal(sheets[0].paragraphs.length, 2);
  assert.equal(sheets[1].lastPage, 16);
  assert.equal(sheetForPage(sheets, 16), 1);
  assert.equal(sheetForPage(sheets, 8), 1);
  const merged = editPreview(p, 1, { type: "merge" });
  assert.equal(merged[0].text, "THE SCIENCE OF POWER");
  assert.equal(p[0].text, "THE");
  assert.equal(merged.length, 3);
  assert.equal(editPreview(p, 2, { type: "merge" }), p); // Never join unrelated PDF pages.
  assert.equal(editPreview(p, 1, { type: "omit" }).length, 3);
  assert.equal(
    editPreview(p, 1, {
      type: "replace",
      text: " The science of power ",
      kind: "heading",
    })[0].text,
    "The science of power",
  );
});
test("EPUB: prévia limita seções longas e não mistura capítulos", () => {
  const p = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    text: `Texto ${i + 1}`,
    section: i < 24 ? "Capítulo I" : "Capítulo II",
  }));
  const sheets = previewSheets(p);
  assert.deepEqual(
    sheets.map((s) => s.paragraphs.length),
    [12, 12, 1],
  );
  assert.equal(sheets[2].label, "Capítulo II");
  assert.equal(editPreview(p, 24, { type: "merge" }), p);
});
test("menu usa o espaço acima quando falta altura e respeita as bordas após crescer", () => {
  assert.deepEqual(
    selectionPosition(
      { left: 100, top: 150, rectTop: 120 },
      { width: 340, height: 45 },
      { width: 1000, height: 700 },
    ),
    { left: 100, top: 160 },
  );
  const nearBottom = selectionPosition(
    { left: 900, top: 650, rectTop: 610 },
    { width: 340, height: 180 },
    { width: 1000, height: 700 },
  );
  assert.deepEqual(nearBottom, { left: 648, top: 420 });
  const small = selectionPosition(
    { left: 300, top: 500, rectTop: 450 },
    { width: 350, height: 300 },
    { width: 390, height: 600 },
  );
  assert.ok(small.left >= 12 && small.left + 350 <= 378);
  assert.ok(small.top >= 12 && small.top + 300 <= 588);
});
test("assistente sem espaço conectado não envia conteúdo nem faz chamada à API", async () => {
  const original = globalThis.fetch;
  let sent = 0;
  globalThis.fetch = async () => {
    sent++;
    throw new Error("Não deveria haver rede.");
  };
  try {
    await assert.rejects(
      () => assist("explain", "Explique", "Meu texto local", "Fonte pessoal"),
      { message: WORKSPACE_REQUIRED_MESSAGE },
    );
    assert.equal(sent, 0);
  } finally {
    globalThis.fetch = original;
  }
});
