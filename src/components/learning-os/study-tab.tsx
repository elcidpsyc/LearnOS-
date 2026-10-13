import {
  useState,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ArrowLeft,
  ArrowUpRight,
  NotebookPen,
  Maximize2,
  Minimize2,
  Headphones,
  VolumeX,
  BookOpen,
  ArrowRight,
  Languages,
  Sparkles,
  MessageCircle,
  Trash2,
  Plus,
  Check,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useVault } from "@/lib/vault/store";
import type { Paragraph, MarginNote, Source } from "@/lib/vault/types";
import { assist } from "@/lib/study/ai";
import { getFile, download } from "@/lib/vault/files";
import { ReaderSettings } from "./reader-settings";
import { TranslatorPopup } from "./translator-popup";
import { AddSourceModal } from "./add-source-modal";
import { Empty, Modal, Overline } from "./ui";
function AnnotatedText({
  paragraph,
  marks,
}: {
  paragraph: Paragraph;
  marks: MarginNote[];
}) {
  const highlights = marks
    .filter((m) => m.type === "highlight" && m.quote)
    .map((m) => ({
      mark: m,
      start: m.start ?? paragraph.text.indexOf(m.quote!),
      end: m.end ?? paragraph.text.indexOf(m.quote!) + m.quote!.length,
    }))
    .filter((m) => m.start >= 0)
    .sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const h of highlights) {
    if (h.start < cursor) continue;
    parts.push(paragraph.text.slice(cursor, h.start));
    parts.push(
      <mark
        key={h.mark.id}
        style={{ background: h.mark.color ?? "var(--highlight)" }}
      >
        {paragraph.text.slice(h.start, h.end)}
      </mark>,
    );
    cursor = h.end;
  }
  parts.push(paragraph.text.slice(cursor));
  return <>{parts}</>;
}
export function StudyTab() {
  const {
    sources,
    activeSourceId,
    setActiveSourceId,
    notes,
    marginNotes,
    settings,
    saveSettings,
    setTab,
    setSelection,
    selection,
    updateSource,
    deleteMarginNote,
    addNote,
    addCard,
    addMarginNote,
    selectNote,
  } = useVault((s) => s);
  const source = sources.find((s) => s.id === activeSourceId) ?? sources[0];
  const [preferences, setPreferences] = useState(false);
  const [notebook, setNotebook] = useState(false);
  const [brief, setBrief] = useState(false);
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<"quick" | "deep">("quick");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const observed = useRef<number>(0);
  const remembered = useRef("");
  useEffect(() => {
    setAnswer("");
    setQuestion("");
    setBrief(false);
    setFileUrl("");
    remembered.current = "";
    observed.current = 0;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    let url = "";
    let cancelled = false;
    if (source?.fileId)
      void getFile(source.fileId).then((file) => {
        if (!cancelled && file) {
          url = URL.createObjectURL(file);
          setFileUrl(url);
        }
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      window.speechSynthesis?.cancel();
    };
  }, [source?.id]);
  useEffect(() => {
    if (!source?.paragraphs.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            const n = Number((entry.target as HTMLElement).dataset.paragraph);
            const index = source.paragraphs.findIndex((p) => p.id === n);
            const progress = Math.round(
              ((index + 1) / source.paragraphs.length) * 100,
            );
            if (progress > observed.current) {
              observed.current = progress;
              updateSource(source.id, {
                progress: Math.max(source.progress, progress),
                lastParagraph: n,
                lastReadAt: new Date().toISOString(),
              });
            }
          }
      },
      { rootMargin: "-20% 0px -25% 0px", threshold: 0.2 },
    );
    document
      .querySelectorAll("[data-paragraph]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [source?.id, source?.paragraphs.length, updateSource]);
  if (!source)
    return (
      <Empty
        title="Sua próxima leitura começa aqui."
        text="Adicione uma fonte para abrir o leitor."
        action={
          <button className="button" onClick={() => setTab("fontes")}>
            Abrir biblioteca
          </button>
        }
      />
    );
  const sourceNotes = notes.filter((n) => n.fonte === source.id);
  const sourceMarks = marginNotes.filter((n) => n.sourceId === source.id);
  const capture = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const getParagraph = (node: Node) =>
      (node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement
      )?.closest("[data-paragraph]") as HTMLElement | null;
    const start = getParagraph(range.startContainer),
      end = getParagraph(range.endContainer);
    if (!start || start !== end) return;
    const paragraphId = Number(start.dataset.paragraph);
    const text = selection.toString().trim();
    if (!text) return;
    const prefix = range.cloneRange();
    prefix.selectNodeContents(start);
    prefix.setEnd(range.startContainer, range.startOffset);
    const raw = selection.toString();
    const offset =
      prefix.toString().length + (raw.length - raw.trimStart().length);
    const rect = range.getBoundingClientRect();
    setSelection({
      sourceId: source.id,
      paragraphId,
      text,
      start: offset,
      end: offset + text.length,
      left: rect.left,
      top: rect.bottom,
      page: source.paragraphs.find((p) => p.id === paragraphId)?.page,
    });
  };
  const ask = async () => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const context = source.paragraphs
        .map((p) => `${p.page ? `[p. ${p.page}]` : `[§ ${p.id}]`} ${p.text}`)
        .join("\n\n");
      const response = await assist(
        "ask",
        question,
        context,
        `${source.author}. ${source.title}. Modo ${depth === "deep" ? "aprofundado, com limites e conexões" : "breve"}.`,
      );
      setAnswer(response.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível responder.");
    } finally {
      setBusy(false);
    }
  };
  const speak = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!("speechSynthesis" in window)) {
      toast.error("A leitura em voz alta não está disponível neste navegador.");
      return;
    }
    const text = source.paragraphs.map((p) => p.text).join("\n");
    if (!text) {
      toast.error("Esta fonte não tem texto extraído para ouvir.");
      return;
    }
    const chunks = text.match(/.{1,900}(?:[.!?]\s|$)|.{1,900}/gs) ?? [text];
    let index = 0;
    setSpeaking(true);
    const next = () => {
      if (index >= chunks.length) {
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = /\b(the|and|of)\b/i.test(text) ? "en-US" : "pt-BR";
      utterance.rate = 0.9;
      utterance.onend = next;
      utterance.onerror = () => setSpeaking(false);
      speechSynthesis.speak(utterance);
    };
    next();
  };
  const goTo = (paragraphId: number) => {
    setNotebook(false);
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-paragraph="${paragraphId}"]`)
        ?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "center",
        }),
    );
  };
  const css = {
    "--reading-width": `${settings.width}px`,
    "--reading-size": `${settings.fontSize}px`,
    "--reading-line": settings.lineHeight,
    "--reading-font":
      settings.font === "serif" ? "var(--font-serif)" : "var(--font-sans)",
  } as CSSProperties;
  return (
    <div
      className={`reader-page ${settings.indent ? "reader-indented" : ""}`}
      style={css}
    >
      <div className="reader-topline">
        <button className="text-button" onClick={() => setTab("fontes")}>
          <ArrowLeft size={14} />
          Biblioteca
        </button>
        <div className="reader-actions">
          <button
            className="icon-button aa-button"
            aria-label="Personalizar leitura"
            onClick={() => setPreferences(true)}
          >
            Aa
          </button>
          <button className="reader-tool" onClick={() => setNotebook(true)}>
            <NotebookPen size={15} />
            <span>Caderno</span>
            <i>
              {sourceNotes.length +
                sourceMarks.filter((m) => m.type === "highlight").length}
            </i>
          </button>
          <button
            className="icon-button"
            aria-label={settings.focus ? "Sair do modo foco" : "Modo foco"}
            onClick={() => saveSettings({ focus: !settings.focus })}
          >
            {settings.focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            className="icon-button"
            aria-label={
              speaking ? "Parar leitura em voz alta" : "Ouvir leitura"
            }
            onClick={speak}
          >
            {speaking ? <VolumeX size={16} /> : <Headphones size={16} />}
          </button>
        </div>
      </div>
      <header className="reader-heading">
        <Overline>
          {source.topic} {source.excerptOnly ? "· RECORTES SALVOS" : ""}
        </Overline>
        <h1>{source.title}</h1>
        <div className="reader-description">
          <span>
            {source.author}
            {source.publishedYear ? ` · ${source.publishedYear}` : ""}
            <small>
              {source.readTime} · {source.paragraphs.length} trechos
              {source.pages ? ` · ${source.pages} páginas` : ""}
            </small>
          </span>
          <div>
            {source.url && (
              <a
                className="text-button"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                Original
                <ArrowUpRight size={13} />
              </a>
            )}
            <select
              aria-label="Escolher fonte para leitura"
              value={source.id}
              onChange={(e) => setActiveSourceId(e.target.value)}
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>
      <section className="reading-brief">
        <button onClick={() => setBrief(!brief)} aria-expanded={brief}>
          <span>
            Visão geral{" "}
            <small>
              {source.claims.length
                ? `${source.claims.length} ideias centrais`
                : `${sourceNotes.length} notas no caderno`}
            </small>
          </span>
          <ChevronDown size={15} className={brief ? "rotated" : ""} />
        </button>
        {brief && (
          <div className="brief-content">
            <p>
              {source.briefSummary ||
                "O material original e suas observações ficam separados, para você voltar à fonte sempre que precisar."}
            </p>
            {source.claims.length > 0 ? (
              <ol>
                {source.claims.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            ) : (
              <ul>
                {sourceNotes.map((n) => (
                  <li key={n.id}>{n.title}</li>
                ))}
              </ul>
            )}
            {source.excerptOnly && (
              <small>
                Você está lendo recortes preservados. Importe a obra para
                consultar o arquivo integral.
              </small>
            )}
          </div>
        )}
      </section>
      {source.lastParagraph && source.progress < 100 && (
        <button
          className="continue-reading"
          onClick={() => goTo(source.lastParagraph!)}
        >
          Continuar do trecho {source.lastParagraph}
          <ArrowRight size={13} />
        </button>
      )}
      {!source.paragraphs.length && (
        <div className="file-reading">
          {fileUrl && source.mime?.startsWith("image/") ? (
            <img src={fileUrl} alt={source.title} />
          ) : fileUrl && source.mime?.startsWith("video/") ? (
            <video src={fileUrl} controls />
          ) : fileUrl && source.mime?.startsWith("audio/") ? (
            <audio src={fileUrl} controls />
          ) : (
            <Empty
              title="O original continua com você."
              text={
                source.fileId
                  ? "Este arquivo não tem texto extraído. Abra o original para consultar."
                  : "Esta obra está no catálogo. Adicione o arquivo ou cole um recorte para ler aqui."
              }
              action={
                fileUrl ? (
                  <a
                    className="button"
                    href={fileUrl}
                    download={source.fileName}
                  >
                    Baixar original
                  </a>
                ) : (
                  <button className="button" onClick={() => setAdding(true)}>
                    <Plus size={15} />
                    Adicionar material
                  </button>
                )
              }
            />
          )}
        </div>
      )}
      <article
        className="reader-body"
        style={{ textAlign: settings.align }}
        onMouseUp={capture}
        onTouchEnd={() => requestAnimationFrame(capture)}
      >
        {source.paragraphs.map((p, index) => {
          const marks = sourceMarks.filter((m) => m.paragraphId === p.id);
          const paragraphNotes = sourceNotes.filter(
            (n) =>
              n.paragraphId === p.id && !marks.some((m) => m.noteId === n.id),
          );
          const count =
            marks.filter((m) => m.type !== "highlight").length +
            paragraphNotes.length;
          return (
            <section className="reader-row" key={p.id}>
              <div className="paragraph-wrap">
                <div className="paragraph-gutter">
                  {settings.numbers && (
                    <button
                      className={count ? "has-margin" : ""}
                      onClick={() =>
                        document
                          .getElementById(`margin-${p.id}`)
                          ?.scrollIntoView({ block: "center" })
                      }
                      aria-label={`Trecho ${p.id}, ${count} anotações`}
                    >
                      {String(p.id).padStart(2, "0")}
                    </button>
                  )}
                </div>
                <p
                  data-paragraph={p.id}
                  className={index === 0 ? "drop-cap" : ""}
                >
                  <AnnotatedText paragraph={p} marks={marks} />
                </p>
                {p.page && (
                  <small className="paragraph-page">PÁGINA {p.page}</small>
                )}
              </div>
              <aside id={`margin-${p.id}`} className="paragraph-margin">
                {marks
                  .filter((m) => m.type !== "highlight")
                  .map((m) => (
                    <details
                      key={m.id}
                      className="margin-note"
                      open={m.type === "note" || m.type === "explain"}
                    >
                      <summary>
                        <span>
                          {m.type === "qa"
                            ? "PERGUNTA"
                            : m.type === "reminder"
                              ? "LEMBRETE"
                              : m.type === "question"
                                ? "EM ABERTO"
                                : "NA MARGEM"}{" "}
                          · § {p.id}
                        </span>
                        <ChevronDown size={11} />
                      </summary>
                      {m.quote && <blockquote>{m.quote}</blockquote>}
                      <p>{m.content}</p>
                      {m.reminder && (
                        <small>
                          Rever em {m.reminder.split("-").reverse().join("/")}
                        </small>
                      )}
                      <button
                        className="margin-delete"
                        aria-label="Remover anotação"
                        onClick={() => deleteMarginNote(m.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </details>
                  ))}
                {paragraphNotes.map((n) => (
                  <div key={n.id} className="margin-note canonical">
                    <span>NOTA · {n.paginas || `§ ${p.id}`}</span>
                    <button
                      onClick={() => {
                        selectNote(n.id);
                        setTab("notas");
                      }}
                    >
                      {n.title}
                    </button>
                  </div>
                ))}
                {index === 0 && count === 0 && (
                  <p className="margin-hint">
                    Esta margem é sua.
                    <br />
                    Selecione uma linha e guarde uma ideia.
                  </p>
                )}
              </aside>
            </section>
          );
        })}
      </article>
      {source.paragraphs.length > 0 && (
        <footer className="reader-foot">
          <span>
            FIM DOS {source.excerptOnly ? "RECORTES" : "TRECHOS"} ·{" "}
            {source.title}
          </span>
          <button className="text-button" onClick={() => setNotebook(true)}>
            Abrir seu caderno
            <ArrowRight size={13} />
          </button>
        </footer>
      )}
      <div className="reading-ask">
        <div className="ask-bar">
          <Sparkles size={15} />
          <input
            aria-label="Perguntar sobre a leitura"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pergunte sobre esta leitura…"
            onKeyDown={(e) => {
              if (e.key === "Enter") void ask();
            }}
          />
          <div className="depth-toggle">
            <button
              className={depth === "quick" ? "active" : ""}
              onClick={() => setDepth("quick")}
            >
              Breve
            </button>
            <button
              className={depth === "deep" ? "active" : ""}
              onClick={() => setDepth("deep")}
            >
              Profundo
            </button>
          </div>
          <button
            className="ask-submit"
            aria-label="Enviar pergunta"
            disabled={!question.trim() || busy || !source.paragraphs.length}
            onClick={() => void ask()}
          >
            {busy ? <span className="spinner" /> : <ArrowRight size={17} />}
          </button>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {answer && (
          <div className="reader-answer">
            <Overline>RESPOSTA SOBRE A LEITURA</Overline>
            <p>{answer}</p>
            <button
              className="text-button"
              onClick={() => {
                const n = addNote({
                  title: question,
                  content: answer,
                  fonte: source.id,
                  paginas: "Leitura",
                  tags: [source.topic],
                  claims: [],
                  commentary: [answer],
                  questions: [question],
                  citation: `${source.author}. ${source.title}.`,
                });
                toast.success("Resposta guardada nas notas.");
                setAnswer("");
              }}
            >
              Guardar resposta
              <Check size={13} />
            </button>
          </div>
        )}
      </div>
      {preferences && <ReaderSettings close={() => setPreferences(false)} />}{" "}
      {adding && <AddSourceModal onClose={() => setAdding(false)} />}
      {notebook && (
        <Modal
          title={`Caderno · ${source.title}`}
          close={() => setNotebook(false)}
          wide
        >
          <div className="notebook-list">
            {sourceMarks
              .filter((m) => m.type === "highlight")
              .map((m) => (
                <button
                  className="notebook-entry"
                  key={m.id}
                  onClick={() => goTo(m.paragraphId)}
                >
                  <Overline>DESTAQUE · § {m.paragraphId}</Overline>
                  <blockquote style={{ borderColor: m.color }}>
                    {m.quote}
                  </blockquote>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {sourceNotes.map((n) => (
              <div className="notebook-entry" key={n.id}>
                <Overline>NOTA · {n.paginas}</Overline>
                <h3>{n.title}</h3>
                <p>{n.content.slice(0, 320)}</p>
                <div className="button-row">
                  {n.paragraphId && (
                    <button
                      className="text-button"
                      onClick={() => goTo(n.paragraphId!)}
                    >
                      Voltar ao trecho
                      <ArrowUpRight size={13} />
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() => {
                      selectNote(n.id);
                      setTab("notas");
                    }}
                  >
                    Abrir nota
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
            {!sourceNotes.length && !sourceMarks.length && (
              <Empty
                title="A margem está aberta."
                text="Selecione um trecho para guardar a primeira ideia."
              />
            )}
          </div>
        </Modal>
      )}
      <TranslatorPopup
        key={
          selection
            ? `${selection.paragraphId}-${selection.start}-${selection.end}`
            : "closed"
        }
      />
    </div>
  );
}
