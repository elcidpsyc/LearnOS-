import { useState } from "react";
import {
  Highlighter,
  NotebookPen,
  Sparkles,
  Languages,
  HelpCircle,
  X,
  ArrowRight,
  Check,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { useVault } from "@/lib/vault/store";
import { localDay } from "@/lib/vault/model";
import { assist, type AssistMode } from "@/lib/study/ai";
import { Modal } from "./ui";
export function TranslatorPopup() {
  const {
    selection,
    setSelection,
    sources,
    settings,
    addMarginNote,
    addNote,
    addCard,
  } = useVault((s) => s);
  const [mode, setMode] = useState<"note" | "question" | "reminder" | null>(
    null,
  );
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!selection) return null;
  const source = sources.find((s) => s.id === selection.sourceId);
  if (!source) return null;
  const citation = `${source.author}. ${source.title}${selection.page ? `, p. ${selection.page}` : `, § ${selection.paragraphId}`}.`;
  const mark = (
    type: "highlight" | "note" | "question" | "reminder" | "explain",
    body: string,
    title: string,
  ) => {
    let noteId: string | undefined;
    if (type !== "highlight")
      noteId = addNote({
        title,
        content: body,
        fonte: source.id,
        paginas: selection.page ?? `§ ${selection.paragraphId}`,
        tags: [source.topic],
        claims: [],
        commentary: [body],
        questions: type === "question" ? [body] : [],
        citation,
        quote: selection.text,
        paragraphId: selection.paragraphId,
      });
    addMarginNote({
      ...selection,
      sourceId: source.id,
      type,
      title,
      content: body,
      quote: selection.text,
      color: settings.highlightColor,
      noteId,
      reminder: type === "reminder" ? date : undefined,
    });
    setSelection(null);
    toast.success(
      type === "highlight"
        ? "Destaque guardado."
        : "Anotação guardada na margem e no caderno.",
    );
  };
  const run = async (action: AssistMode) => {
    setBusy(true);
    setError("");
    try {
      const result = await assist(
        action,
        selection.text,
        source.paragraphs.find((p) => p.id === selection.paragraphId)?.text ??
          selection.text,
        citation,
      );
      if (action === "flashcard") {
        const cards = result.cards?.length
          ? result.cards
          : [
              {
                question:
                  result.title ?? `O que você aprendeu com este trecho?`,
                answer: result.answer,
              },
            ];
        for (const c of cards)
          addCard({
            frente: c.question,
            verso: c.answer,
            proxima: localDay(),
            qualidade: 1,
            revisoes: 0,
            fonte: source.id,
            tags: [source.topic],
            paragraphId: selection.paragraphId,
            location: selection.page ?? `§ ${selection.paragraphId}`,
          });
        setSelection(null);
        toast.success("Cartão criado com referência ao trecho.");
      } else
        mark(
          "explain",
          result.answer,
          action === "translate"
            ? "Tradução do trecho"
            : "Explicação do trecho",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "A IA está indisponível.");
    } finally {
      setBusy(false);
    }
  };
  const top = Math.min(selection.top + 8, window.innerHeight - 160);
  const left = Math.max(12, Math.min(selection.left, window.innerWidth - 360));
  return (
    <>
      {!mode && (
        <div
          className="selection-tools"
          style={{ top: Math.max(76, top), left }}
          role="toolbar"
          aria-label="Ferramentas do trecho selecionado"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="selection-toolbar">
            <button
              aria-label="Destacar trecho"
              title="Destacar"
              disabled={busy}
              onClick={() => mark("highlight", "", selection.text.slice(0, 60))}
            >
              <Highlighter size={17} />
            </button>
            <button
              aria-label="Anotar trecho"
              title="Anotar"
              disabled={busy}
              onClick={() => setMode("note")}
            >
              <NotebookPen size={17} />
            </button>
            <button
              aria-label="Explicar trecho"
              title="Explicar com IA"
              disabled={busy}
              onClick={() => void run("explain")}
            >
              <Sparkles size={17} />
            </button>
            <button
              aria-label="Traduzir trecho"
              title="Traduzir com IA"
              disabled={busy}
              onClick={() => void run("translate")}
            >
              <Languages size={17} />
            </button>
            <button
              aria-label="Criar cartão do trecho"
              title="Criar cartão com IA"
              disabled={busy}
              onClick={() => void run("flashcard")}
            >
              <HelpCircle size={17} />
            </button>
            <button
              aria-label="Criar lembrete do trecho"
              title="Lembrar depois"
              disabled={busy}
              onClick={() => setMode("reminder")}
            >
              <CalendarClock size={17} />
            </button>
            <button
              aria-label="Fechar seleção"
              onClick={() => setSelection(null)}
            >
              <X size={15} />
            </button>
          </div>
          {busy && (
            <p className="selection-status" role="status">
              Pensando junto com o trecho…
            </p>
          )}
          {error && (
            <p className="selection-error" role="alert">
              {error}
              <button onClick={() => setMode("note")}>Anotar sem IA</button>
            </p>
          )}
        </div>
      )}
      {mode && (
        <Modal
          title={
            mode === "reminder"
              ? "Voltar a esta ideia"
              : mode === "question"
                ? "Guardar pergunta"
                : "Anotar na margem"
          }
          close={() => {
            setMode(null);
            setSelection(null);
          }}
        >
          <div className="form-stack">
            <blockquote className="selected-quote">{selection.text}</blockquote>
            <small className="muted">{citation}</small>
            <div className="segmented">
              <button
                className={mode === "note" ? "active" : ""}
                onClick={() => setMode("note")}
              >
                Nota
              </button>
              <button
                className={mode === "question" ? "active" : ""}
                onClick={() => setMode("question")}
              >
                Pergunta
              </button>
              <button
                className={mode === "reminder" ? "active" : ""}
                onClick={() => setMode("reminder")}
              >
                Lembrete
              </button>
            </div>
            <label className="field">
              {mode === "question"
                ? "O que ficou em aberto?"
                : "O que você quer guardar?"}
              <textarea
                autoFocus
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Uma ideia, dúvida ou conexão…"
              />
            </label>
            {mode === "reminder" && (
              <label className="field">
                Rever em
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            )}
            <button
              className="button primary"
              disabled={!content.trim() || (mode === "reminder" && !date)}
              onClick={() =>
                mark(mode, content.trim(), content.trim().slice(0, 80))
              }
            >
              <Check size={15} />
              Guardar no caderno
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
