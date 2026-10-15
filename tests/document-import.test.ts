import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { DOMParser } from "linkedom";
import { organizePdf, type PdfPage } from "../src/lib/study/document-layout";
import { archivePath, readEpub } from "../src/lib/study/epub";
import { reflowSource } from "../src/lib/study/reflow";
import { freshVault } from "../src/lib/vault/seed";
import { vaultSchema } from "../src/lib/vault/model";
const fragment = (
  text: string,
  x: number,
  y: number,
  width = 100,
  height = 10,
) => ({ text, x, y, width, height });
test("PDF: reconstrói geometria fora da ordem de desenho e remove cabeçalhos recorrentes", () => {
  const pages: PdfPage[] = Array.from({ length: 3 }, (_, i) => ({
    number: i + 1,
    width: 600,
    height: 800,
    items: [
      fragment("tinuidade do argumento.", 40, 115, 300),
      fragment("A con-", 40, 100, 300),
      fragment(`Livro de teste ${i + 1}`, 40, 25, 200),
      fragment("Novo parágrafo.", 55, 145, 250),
    ],
  }));
  const read = organizePdf(pages);
  assert.equal(read.report.removedHeaders, 3);
  assert.equal(read.report.columnPages, 0);
  assert.equal(read.paragraphs[0].text, "A continuidade do argumento.");
  assert.equal(read.paragraphs[1].text, "Novo parágrafo.");
  assert.equal(
    organizePdf(pages, { removeHeaders: false }).report.removedHeaders,
    0,
  );
  assert.match(
    organizePdf(pages, { joinLines: false }).text,
    /A con-\ntinuidade/,
  );
});
test("PDF: duas colunas são lidas verticalmente, com detecção e ajuste manual", () => {
  const page: PdfPage = {
    number: 1,
    width: 600,
    height: 800,
    items: Array.from({ length: 8 }, (_, i) => [
      fragment(`Esquerda ${i}`, 40, 100 + i * 15, 85),
      fragment("continua", 135, 100 + i * 15, 75),
      fragment(`Direita ${i}`, 330, 100 + i * 15, 85),
      fragment("continua", 425, 100 + i * 15, 75),
    ]).flat(),
  };
  const auto = organizePdf([page]);
  assert.equal(auto.report.columnPages, 1);
  assert.ok(auto.text.indexOf("Esquerda 7") < auto.text.indexOf("Direita 0"));
  assert.equal(
    organizePdf([page], { columns: "single" }).report.columnPages,
    0,
  );
  assert.equal(
    organizePdf([page], { columns: "double" }).report.columnPages,
    1,
  );
  const empty = organizePdf([{ ...page, items: [] }]);
  assert.deepEqual(empty.report.emptyPages, [1]);
  assert.equal(empty.report.warnings.length, 1);
});
test("EPUB: segue spine, resolve caminhos, preserva títulos e não duplica blocos aninhados", async () => {
  const zip = new JSZip();
  zip.file(
    "META-INF/container.xml",
    '<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>',
  );
  zip.file(
    "OPS/book.opf",
    '<package xmlns:dc="urn:dc"><metadata><dc:title>Livro original</dc:title><dc:creator>Autora</dc:creator><dc:language>en</dc:language></metadata><manifest><item id="a" href="text/a.xhtml"/><item id="b" href="text/../b.xhtml"/><item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>',
  );
  zip.file(
    "OPS/b.xhtml",
    "<html><head><title>Capítulo B</title></head><body><h1>B primeiro</h1><blockquote><p>Trecho único.</p></blockquote><p>Texto<br/>com quebra.</p></body></html>",
  );
  zip.file(
    "OPS/text/a.xhtml",
    "<html><body><h2>A depois</h2><ul><li>Um item</li></ul></body></html>",
  );
  zip.file("OPS/cover.jpg", new Uint8Array([1, 2, 3]));
  const read = await readEpub(
    zip,
    new DOMParser() as unknown as globalThis.DOMParser,
    () => {},
  );
  assert.equal(read.title, "Livro original");
  assert.equal(read.author, "Autora");
  assert.equal(read.language, "en");
  assert.equal(read.paragraphs[0].text, "B primeiro");
  assert.equal(read.paragraphs[1].kind, "quote");
  assert.equal(read.text.match(/Trecho único/g)?.length, 1);
  assert.equal(read.paragraphs[2].text, "Texto\ncom quebra.");
  assert.equal(read.paragraphs[3].text, "A depois");
  assert.equal(read.cover?.type, "image/jpeg");
  assert.equal(archivePath("OPS/book.opf", "../../escape"), undefined);
  assert.equal(archivePath("OPS/book.opf", "https://evil.test/a"), undefined);
});
test("reorganização: remapeia seleções entre parágrafos, conserva IDs estáveis e separa âncoras ambíguas", () => {
  const v = freshVault();
  const original = v.sources[0];
  v.sources = [
    {
      ...original,
      id: "book",
      lastParagraph: 1,
      paragraphs: [
        { id: 1, text: "Uma ideia\nimportante. Outra ideia." },
        { id: 2, text: "Fica igual." },
        { id: 3, text: "Trecho desaparecido" },
      ],
    },
  ];
  v.notes = [];
  v.cards = [];
  const stamp = "2026-10-15";
  v.marginNotes = [
    {
      id: "m1",
      sourceId: "book",
      paragraphId: 1,
      quote: "ideia\nimportante. Outra",
      type: "qa",
      title: "Como?",
      content: "Resposta guardada",
      conversation: [
        { role: "user", content: "Pergunta guardada", createdAt: stamp },
      ],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "m2",
      sourceId: "book",
      paragraphId: 3,
      quote: "Trecho desaparecido",
      type: "highlight",
      title: "Destaque",
      content: "",
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
  const read = {
    text: "Uma ideia importante.\n\nOutra ideia.\n\nFica igual.",
    pages: 0,
    format: "EPUB",
    paragraphs: [
      { id: 1, text: "Uma ideia importante." },
      { id: 2, text: "Outra ideia." },
      { id: 3, text: "Fica igual." },
    ],
  };
  const result = reflowSource(v, "book", read);
  assert.equal(result.sources[0].paragraphs[2].id, 2);
  assert.ok(result.sources[0].paragraphs[0].id > 3);
  assert.equal(result.marginNotes[0].anchors?.length, 2);
  assert.equal(
    result.marginNotes[0].conversation?.[0].content,
    "Pergunta guardada",
  );
  assert.equal(result.marginNotes[1].anchorStatus, "unmatched");
  assert.equal(result.marginNotes[1].paragraphId, 0);
  assert.equal(result.marginNotes[1].quote, "Trecho desaparecido");
  assert.deepEqual(result.stats, { verified: 1, unmatched: 1 });
  const restored = vaultSchema.parse({ ...v, ...result });
  assert.equal(restored.sources[0].contentRevision, 1);
  assert.throws(
    () => reflowSource(v, "book", { text: "", pages: 0, format: "PDF" }),
    /preservado/,
  );
});

test("reorganização não associa um destaque a uma ocorrência ambígua nem apaga seu cartão", () => {
  const v = freshVault();
  const stamp = "2026-10-15";
  const source = {
    ...v.sources[0],
    id: "repeated",
    paragraphs: [{ id: 10, text: "Uma citação repetida." }],
  };
  v.sources = [source];
  v.notes = [];
  v.marginNotes = [
    {
      id: "ambiguous",
      sourceId: source.id,
      paragraphId: 10,
      quote: "citação",
      type: "highlight",
      title: "Trecho",
      content: "Comentário preservado",
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
  v.cards = [
    {
      ...v.cards[0],
      id: "card",
      fonte: source.id,
      paragraphId: 10,
      frente: "Minha pergunta",
      verso: "Minha resposta",
    },
  ];
  const result = reflowSource(v, source.id, {
    text: "Uma citação repetida.\n\nOutra citação.",
    pages: 0,
    format: "PDF",
    paragraphs: [
      { id: 1, text: "Uma citação repetida." },
      { id: 2, text: "Outra citação." },
    ],
  });
  assert.equal(result.marginNotes[0].anchorStatus, "unmatched");
  assert.equal(result.marginNotes[0].content, "Comentário preservado");
  assert.deepEqual(result.marginNotes[0].anchors, []);
  assert.equal(result.cards[0].paragraphId, 10);
  assert.equal(result.cards[0].verso, "Minha resposta");
});

test('PDF: capitular começa a frase e suas linhas envolventes continuam no mesmo parágrafo',()=>{
  const p:PdfPage={number:1,width:400,height:600,items:[fragment('A',20,130,25,40),fragment('leitura começa pela primeira linha de um texto',50,100,300),fragment('e continua ao redor da capitular sem inverter',50,115,300),fragment('a ordem original das palavras deste parágrafo.',50,130,300),fragment('A linha seguinte mantém a mesma ideia.',30,145,320)]};
  const read=organizePdf([p]);assert.equal(read.paragraphs[0].kind,'paragraph');assert.match(read.paragraphs[0].text,/^A leitura começa/);assert.match(read.paragraphs[0].text,/primeira linha de um texto e continua/);assert.doesNotMatch(read.text,/\n\nA\n\n/);
});
