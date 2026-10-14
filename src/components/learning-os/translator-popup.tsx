import { useEffect, useRef, useState } from "react";
import { Highlighter, Copy, MoreHorizontal, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "@/lib/vault/store";
import { localDay } from "@/lib/vault/model";
import { assist, type AssistMode } from "@/lib/study/ai";
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_NAMES,
  readingContext,
} from "@/lib/study/reader";
import { Modal } from "./ui";
import { Thinking, copyText } from "./reader-support";

export function TranslatorPopup({
  onThinking,
}: {
  onThinking: (paragraph: number | null) => void;
}) {
  const {
    selection,
    setSelection,
    sources,
    settings,
    saveSettings,
    addMarginNote,
    addNote,
    addCard,
  } = useVault((s) => s);
  const [mode, setMode] = useState<
    "ask" | "note" | "question" | "reminder" | "compare" | null
  >(null);
  const [content, setContent] = useState("");
  const [other, setOther] = useState("");
  const [date, setDate] = useState("");
  const [more, setMore] = useState(false);
  const [colors, setColors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      onThinking(null);
    },
    [onThinking],
  );
  useEffect(() => {
    const typeToAsk = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selection && !mode) {
        e.preventDefault();
        setSelection(null);
        return;
      }
      if (
        !selection ||
        mode ||
        busy ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.key.length !== 1 ||
        !e.key.trim() ||
        (e.target as Element)?.closest(
          "input,textarea,select,[contenteditable],dialog",
        )
      )
        return;
      e.preventDefault();
      setMode("ask");
      setContent(e.key);
    };
    document.addEventListener("keydown", typeToAsk);
    return () => document.removeEventListener("keydown", typeToAsk);
  }, [selection, mode, busy]);
  if (!selection) return null;
  const source = sources.find((s) => s.id === selection.sourceId);
  if (!source) return null;
  const citation = `${source.author}. ${source.title}, ¶${selection.paragraphId}${selection.anchors && selection.anchors.length > 1 ? `–¶${selection.anchors.at(-1)!.paragraphId}` : ""}.`;
  const anchor = {
    sourceId: source.id,
    paragraphId: selection.paragraphId,
    quote: selection.text,
    start: selection.start,
    end: selection.end,
    anchors: selection.anchors,
    page: selection.page,
  };
  const mark = (
    type: "highlight" | "note" | "question" | "reminder",
    body: string,
    color = settings.highlightColor,
  ) => {
    let noteId: string | undefined;
    if (type !== "highlight")
      noteId = addNote({
        title: body.slice(0, 80),
        content: body,
        fonte: source.id,
        paginas: selection.page ?? `¶${selection.paragraphId}`,
        tags: [source.topic],
        claims: [],
        commentary: [body],
        questions: type === "question" ? [body] : [],
        citation,
        quote: selection.text,
        paragraphId: selection.paragraphId,
      });
    addMarginNote({
      ...anchor,
      type,
      title: body.slice(0, 80) || selection.text.slice(0, 80),
      content: body,
      color,
      noteId,
      reminder: type === "reminder" ? date : undefined,
    });
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    toast.success(
      type === "highlight"
        ? "Destaque guardado."
        : "Anotação guardada no caderno.",
    );
  };
  const run = async (action: AssistMode, custom = "") => {
    if (busy) return;
    setBusy(true);
    setError("");
    onThinking(selection.paragraphId);
    request.current = new AbortController();
    const prompt =
      custom ||
      (
        {
          define: "Defina este termo no contexto.",
          simplify: "Explique de maneira mais simples.",
          translate: "Traduza somente o trecho selecionado para português.",
          flashcard: "Crie cartões sobre este trecho.",
          factcheck:
            "Verifique as afirmações deste trecho com fontes externas.",
        } as Record<string, string>
      )[action] ||
      "Explique este trecho e sua relação com o argumento.";
    try {
      let context = readingContext(
        source,
        (selection.anchors ?? [selection]).map((a) => a.paragraphId),
        action === "compare" ? 38000 : 78000,
      ).text;
      if (action === "compare") {
        const second = sources.find((s) => s.id === other);
        if (!second) throw new Error("Escolha outro material para comparar.");
        context = `FONTE A: ${source.title}\n${context.replace(/\[¶(\d+)\]/g, "[A¶$1]")}\n\nFONTE B: ${second.author}. ${second.title}\n${readingContext(second, [], 38000).text.replace(/\[¶(\d+)\]/g, "[B¶$1]")}\nCite a fonte A usando [A¶n] e a fonte B usando [B¶n], mantendo os números fornecidos. Não use [¶n] sem a letra da fonte.`;
      }
      const userPrompt = `${prompt}\n\nTRECHO SELECIONADO:\n${selection.text}`;
      if (userPrompt.length > 12000)
        throw new Error(
          "Selecione um trecho menor para conversar. Você pode destacar a seleção inteira.",
        );
      const result = await assist(
        action,
        userPrompt,
        context,
        citation.slice(0, 3000),
        {
          web: action === "factcheck" || settings.webSearch,
          signal: request.current.signal,
        },
      );
      if (action === "flashcard") {
        if (!result.cards?.length)
          throw new Error(
            "A resposta não trouxe cartões válidos. Tente novamente.",
          );
        for (const card of result.cards)
          addCard({
            frente: card.question,
            verso: card.answer,
            proxima: localDay(),
            qualidade: 1,
            revisoes: 0,
            fonte: source.id,
            tags: [source.topic],
            paragraphId: selection.paragraphId,
            location: selection.page ?? `¶${selection.paragraphId}`,
          });
        toast.success("Cartões guardados com referência ao trecho.");
      } else {
        const stamp = new Date().toISOString();
        addMarginNote({
          ...anchor,
          type: "qa",
          title: prompt,
          content: result.answer,
          action,
          comparisonSourceId: action === "compare" ? other : undefined,
          model: result.model,
          references: result.references,
          conversation: [
            { role: "user", content: prompt, createdAt: stamp },
            {
              role: "assistant",
              content: result.answer,
              createdAt: stamp,
              model: result.model,
              references: result.references,
            },
          ],
        });
        toast.success("Resposta guardada na margem e no caderno.");
      }
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      if (!request.current.signal.aborted)
        setError(e instanceof Error ? e.message : "A IA não respondeu.");
    } finally {
      setBusy(false);
      onThinking(null);
    }
  };
  const close = () => {
    request.current?.abort();
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };
  const singleWord = selection.text.trim().split(/\s+/).length <= 3;
  return (
    <>
      {!mode && (
        <div
          className="selection-tools"
          style={{
            top: Math.max(
              80,
              Math.min(selection.top + 10, window.innerHeight - 250),
            ),
            left: Math.max(
              12,
              Math.min(selection.left, window.innerWidth - 430),
            ),
          }}
          role="toolbar"
          aria-label="Ferramentas do trecho selecionado"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="selection-toolbar">
            <button
              disabled={busy}
              onClick={() => setMode("ask")}
              title="Perguntar sobre o trecho"
            >
              Perguntar
            </button>
            <button
              disabled={busy}
              onClick={() => void run("explain")}
              title="Entender o sentido e a função deste trecho"
            >
              Explicar
            </button>
            <button
              disabled={busy}
              onClick={() => void run(singleWord ? "define" : "simplify")}
            >
              {singleWord ? "Definir" : "Simplificar"}
            </button>
            <button
              aria-label="Cores de destaque"
              aria-expanded={colors}
              onClick={() => setColors(!colors)}
              disabled={busy}
            >
              <Highlighter size={16} />
            </button>
            <button
              aria-label="Copiar trecho"
              onClick={() => void copyText(selection.text)}
            >
              <Copy size={16} />
            </button>
            <button
              aria-label="Mais ações do trecho"
              aria-expanded={more}
              onClick={() => setMore(!more)}
              disabled={busy}
            >
              <MoreHorizontal size={17} />
            </button>
            <button aria-label="Fechar seleção" onClick={close}>
              <X size={15} />
            </button>
          </div>
          {colors && (
            <div className="selection-colors">
              {HIGHLIGHT_COLORS.map((color, i) => (
                <button
                  key={color}
                  aria-label={`Destacar em ${HIGHLIGHT_NAMES[i].toLowerCase()}`}
                  style={{ background: color }}
                  onClick={() => mark("highlight", "", color)}
                />
              ))}
            </div>
          )}
          {more && (
            <div className="selection-more">
              <button onClick={() => setMode("note")}>Anotar</button>
              <button onClick={() => setMode("question")}>
                Guardar dúvida
              </button>
              <button onClick={() => void run("translate")}>Traduzir</button>
              <button onClick={() => void run("define")}>Definir</button>
              <button onClick={() => void run("simplify")}>Simplificar</button>
              <button onClick={() => setMode("compare")}>
                Comparar materiais
              </button>
              <button onClick={() => void run("factcheck")}>
                Verificar com fontes
              </button>
              <button onClick={() => void run("flashcard")}>
                Criar cartões
              </button>
              <button onClick={() => setMode("reminder")}>
                Lembrar depois
              </button>
            </div>
          )}
          {busy && <Thinking />}
          {error && (
            <p className="selection-error" role="alert">
              {error}
              <button onClick={() => setMode("note")}>Anotar uma ideia</button>
            </p>
          )}
        </div>
      )}
      {mode && (
        <Modal
          title={
            mode === "ask"
              ? "Pensar sobre este trecho"
              : mode === "compare"
                ? "Comparar materiais"
                : mode === "reminder"
                  ? "Voltar a esta ideia"
                  : mode === "question"
                    ? "Guardar uma dúvida"
                    : "Anotar no caderno"
          }
          close={close}
          className="selection-dialog"
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "ask" || mode === "compare")
                void run(mode, content.trim());
              else mark(mode, content.trim());
            }}
          >
            <blockquote className="selected-quote">{selection.text}</blockquote>
            <small className="muted">{citation}</small>
            {mode === "compare" && (
              <label className="field">
                Comparar com
                <select
                  required
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                >
                  <option value="">Escolha outro material</option>
                  {sources
                    .filter((s) => s.id !== source.id && s.paragraphs.length)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label className="field">
              {mode === "ask" || mode === "compare"
                ? "O que você quer entender?"
                : "Sua ideia"}
              <textarea
                autoFocus
                rows={4}
                maxLength={5000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                placeholder={
                  mode === "compare"
                    ? "Compare as posições, convergências e divergências…"
                    : "Escreva aqui…"
                }
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
            {(mode === "ask" || mode === "compare") && (
              <div className="ask-options">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.webSearch}
                    onChange={(e) =>
                      saveSettings({ webSearch: e.target.checked })
                    }
                  />{" "}
                  Web
                </label>
                <select
                  aria-label="Profundidade da resposta"
                  value={settings.answerDepth}
                  onChange={(e) =>
                    saveSettings({
                      answerDepth: e.target.value as "quick" | "deep",
                    })
                  }
                >
                  <option value="quick">Rápida</option>
                  <option value="deep">Aprofundada</option>
                </select>
              </div>
            )}
            {busy && <Thinking />}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary"
              disabled={
                busy || !content.trim() || (mode === "compare" && !other)
              }
            >
              {mode === "ask" || mode === "compare"
                ? "Enviar pergunta"
                : "Guardar no caderno"}
              <ArrowRight size={15} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
