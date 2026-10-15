import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type CSSProperties,
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
  ArrowRight,
  Plus,
  Keyboard,
  Pause,
  Play,
  Map,
  ScanText,
} from "lucide-react";
import { toast } from "sonner";
import { useVault, snapshot } from "@/lib/vault/store";
import type { Source, Paragraph } from "@/lib/vault/types";
import { assist } from "@/lib/study/ai";
import {
  captureReadingSelection,
  buildHighlightRuns,
  notebookEntries,
  readingContext,
  safeUrl,
} from "@/lib/study/reader";
import { getFile } from "@/lib/vault/files";
import { ReaderSettings } from "./reader-settings";
import { TranslatorPopup } from "./translator-popup";
import { AddSourceModal } from "./add-source-modal";
import { ReorganizeSourceModal } from "./file-import-panel";
import { Empty, Modal, Overline } from "./ui";
import {
  AnswerText,
  MarginConversation,
  ReaderMinimap,
  ReaderNotebook,
  Thinking,
} from "./reader-support";

export function StudyTab() {
  const { sources, activeSourceId, setTab } = useVault((s) => s);
  const source = sources.find((s) => s.id === activeSourceId) ?? sources[0];
  return source ? (
    <Reader
      key={`${source.id}:${source.contentRevision ?? 0}`}
      source={source}
    />
  ) : (
    <Empty
      title="Sua próxima leitura começa aqui."
      text="Adicione um material para abrir o leitor."
      action={
        <button className="button" onClick={() => setTab("fontes")}>
          Abrir biblioteca
        </button>
      }
    />
  );
}
function Reader({ source }: { source: Source }) {
  const {
    sources,
    notes,
    marginNotes,
    settings,
    saveSettings,
    setTab,
    setActiveSourceId,
    selection,
    setSelection,
    updateSource,
    addMarginNote,
    selectNote,
    readerNavigation,
  } = useVault((s) => s);
  const [preferences, setPreferences] = useState(false);
  const [reorganizing, setReorganizing] = useState(false);
  const [notebook, setNotebook] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [keys, setKeys] = useState(false);
  const [brief, setBrief] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [briefBusy, setBriefBusy] = useState(false);
  const [error, setError] = useState("");
  const [briefError, setBriefError] = useState("");
  const [thinking, setThinking] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [adding, setAdding] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [current, setCurrent] = useState(
    source.lastParagraph ?? source.paragraphs[0]?.id ?? 0,
  );
  const article = useRef<HTMLElement>(null);
  const questionInput = useRef<HTMLInputElement>(null);
  const requests = useRef(new Set<AbortController>());
  const speechSession = useRef(0);
  const navigationTarget = useRef<number | null>(null);
  const readingPosition = useRef({
    latest: source.lastParagraph ?? 0,
    progress: source.progress,
  });
  const paragraphs = useRef(source.paragraphs);
  paragraphs.current = source.paragraphs;
  const sourceMarks = useMemo(
    () => marginNotes.filter((m) => m.sourceId === source.id),
    [marginNotes, source.id],
  );
  const highlighted = useMemo(
    () => buildHighlightRuns(source, sourceMarks),
    [source.paragraphs, sourceMarks],
  );
  const sourceNotes = notes.filter((n) => n.fonte === source.id);
  const goTo = useCallback(
    (paragraphId: number) => {
      const index = paragraphs.current.findIndex((p) => p.id === paragraphId);
      if (index < 0) return;
      navigationTarget.current = paragraphId;
      Object.assign(readingPosition.current, {
        latest: paragraphId,
        progress: Math.max(
          readingPosition.current.progress,
          Math.round(((index + 1) / paragraphs.current.length) * 100),
        ),
      });
      updateSource(source.id, {
        lastParagraph: paragraphId,
        progress: readingPosition.current.progress,
        lastReadAt: new Date().toISOString(),
      });
      setNotebook(false);
      setMapOpen(false);
      setCurrent(paragraphId);
      requestAnimationFrame(() =>
        document.getElementById(`paragraph-${paragraphId}`)?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "center",
        }),
      );
    },
    [source.id, updateSource],
  );
  useEffect(() => {
    if (readerNavigation?.sourceId === source.id) {
      if (readerNavigation.paragraphId) goTo(readerNavigation.paragraphId);
      else {
        setNotebook(true);
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    }
  }, [readerNavigation, source.id, goTo]);
  useEffect(() => {
    let url = "",
      disposed = false;
    if (source.fileId)
      void getFile(source.fileId).then((file) => {
        if (!disposed && file) {
          url = URL.createObjectURL(file);
          setFileUrl(url);
        }
      });
    if (!readerNavigation && source.lastParagraph)
      requestAnimationFrame(() => goTo(source.lastParagraph!));
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
      speechSession.current++;
      window.speechSynthesis?.cancel();
      requests.current.forEach((r) => r.abort());
    };
  }, [source.id, goTo]);
  useEffect(() => {
    if (!article.current) return;
    let timer: ReturnType<typeof setTimeout>;
    const position = readingPosition.current;
    const manualScroll = () => {
      navigationTarget.current = null;
    };
    const scrollingKey = (event: KeyboardEvent) => {
      if (
        [
          "PageDown",
          "PageUp",
          "ArrowDown",
          "ArrowUp",
          "Home",
          "End",
          " ",
        ].includes(event.key) &&
        !(event.target as Element)?.closest(
          "input,textarea,select,[contenteditable],dialog",
        )
      )
        manualScroll();
    };
    window.addEventListener("wheel", manualScroll, { passive: true });
    window.addEventListener("touchmove", manualScroll, { passive: true });
    document.addEventListener("pointerdown", manualScroll);
    document.addEventListener("keydown", scrollingKey);
    const observer = new IntersectionObserver(
      (entries) => {
        if (navigationTarget.current !== null) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top - 150) -
              Math.abs(b.boundingClientRect.top - 150),
          );
        if (!visible.length) return;
        const paragraphId = Number(
          (visible[0].target as HTMLElement).dataset.paragraph,
        );
        if (position.latest === paragraphId) return;
        position.latest = paragraphId;
        setCurrent(paragraphId);
        const index = source.paragraphs.findIndex((p) => p.id === paragraphId);
        position.progress = Math.max(
          position.progress,
          Math.round(((index + 1) / source.paragraphs.length) * 100),
        );
        clearTimeout(timer);
        timer = setTimeout(
          () =>
            updateSource(source.id, {
              lastParagraph: readingPosition.current.latest,
              progress: readingPosition.current.progress,
              lastReadAt: new Date().toISOString(),
            }),
          450,
        );
      },
      { rootMargin: "-100px 0px -45% 0px", threshold: 0.15 },
    );
    article.current
      .querySelectorAll("[data-paragraph]")
      .forEach((p) => observer.observe(p));
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      window.removeEventListener("wheel", manualScroll);
      window.removeEventListener("touchmove", manualScroll);
      document.removeEventListener("pointerdown", manualScroll);
      document.removeEventListener("keydown", scrollingKey);
      if (readingPosition.current.latest && snapshot().sources.find(s=>s.id===source.id)?.contentRevision===source.contentRevision)
        updateSource(source.id, {
          lastParagraph: readingPosition.current.latest,
          progress: readingPosition.current.progress,
          lastReadAt: new Date().toISOString(),
        });
    };
  }, [source.id, source.paragraphs.length, updateSource]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        (e.target as Element)?.closest(
          "input,textarea,select,[contenteditable],dialog",
        ) ||
        selection
      )
        return;
      const index = source.paragraphs.findIndex((p) => p.id === current);
      switch (e.key.toLowerCase()) {
        case "/":
          e.preventDefault();
          questionInput.current?.focus();
          break;
        case "j":
        case "k": {
          e.preventDefault();
          const p =
            source.paragraphs[
              Math.max(
                0,
                Math.min(
                  source.paragraphs.length - 1,
                  index + (e.key.toLowerCase() === "j" ? 1 : -1),
                ),
              )
            ];
          if (p) goTo(p.id);
          break;
        }
        case "n":
          e.preventDefault();
          setNotebook((v) => !v);
          break;
        case "f":
          e.preventDefault();
          saveSettings({ focus: !settings.focus });
          break;
        case "b":
          e.preventDefault();
          setBrief((v) => !v);
          break;
        case "?":
          e.preventDefault();
          setKeys(true);
          break;
        case "enter": {
          const p = source.paragraphs[index];
          if (!p) break;
          e.preventDefault();
          setSelection({
            sourceId: source.id,
            paragraphId: p.id,
            text: p.text,
            start: 0,
            end: p.text.length,
            left: 80,
            top: 110,
            anchors: [
              {
                paragraphId: p.id,
                start: 0,
                end: p.text.length,
                quote: p.text,
              },
            ],
          });
          break;
        }
        case "[":
        case "]": {
          e.preventDefault();
          const ordered = [
            ...new Set(
              sourceMarks
                .filter((m) => m.type !== "highlight" && m.paragraphId)
                .map((m) => m.paragraphId),
            ),
          ].sort((a, b) => a - b);
          const target =
            e.key === "]"
              ? (ordered.find((n) => n > current) ?? ordered[0])
              : (ordered.filter((n) => n < current).at(-1) ?? ordered.at(-1));
          if (target) goTo(target);
          break;
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [
    source,
    current,
    selection,
    settings.focus,
    sourceMarks,
    goTo,
    saveSettings,
    setSelection,
  ]);
  const capture = () => {
    if (article.current) {
      const captured = captureReadingSelection(article.current, source);
      if (captured) setSelection(captured);
    }
  };
  const ask = async () => {
    if (!question.trim() || busy) return;
    const prompt = question.trim();
    const controller = new AbortController();
    requests.current.add(controller);
    setBusy(true);
    setError("");
    try {
      const result = await assist(
        "ask",
        prompt,
        readingContext(source).text,
        `${source.author}. ${source.title}.`,
        { web: settings.webSearch, signal: controller.signal },
      );
      const stamp = new Date().toISOString();
      addMarginNote({
        sourceId: source.id,
        paragraphId: 0,
        type: "qa",
        title: prompt,
        content: result.answer,
        action: "ask",
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
      setQuestion("");
      setNotebook(true);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Não foi possível responder.",
        );
    } finally {
      requests.current.delete(controller);
      setBusy(false);
    }
  };
  const generateBrief = async () => {
    if (briefBusy) return;
    setBrief(true);
    setBriefBusy(true);
    setBriefError("");
    const controller = new AbortController();
    requests.current.add(controller);
    try {
      const result = await assist(
        "overview",
        "Crie uma síntese, principais afirmações com referências e um mapa do texto.",
        readingContext(source).text,
        `${source.author}. ${source.title}.`,
        { signal: controller.signal },
      );
      if (!result.overview)
        throw new Error("Não recebi uma visão geral válida. Tente novamente.");
      updateSource(source.id, {
        overview: {
          ...result.overview,
          generatedAt: new Date().toISOString(),
          model: result.model,
        },
      });
    } catch (e) {
      if (!controller.signal.aborted)
        setBriefError(
          e instanceof Error
            ? e.message
            : "Não foi possível gerar a visão geral.",
        );
    } finally {
      requests.current.delete(controller);
      setBriefBusy(false);
    }
  };
  const stopSpeech = () => {
    speechSession.current++;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  };
  const speak = () => {
    if (speaking) {
      stopSpeech();
      return;
    }
    if (!("speechSynthesis" in window)) {
      toast.error("Este navegador não oferece leitura em voz alta.");
      return;
    }
    const session = ++speechSession.current;
    let index = Math.max(
      0,
      source.paragraphs.findIndex((p) => p.id === current),
    );
    setSpeaking(true);
    setPaused(false);
    const next = () => {
      if (session !== speechSession.current) return;
      const p = source.paragraphs[index++];
      if (!p) {
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(p.text);
      utterance.lang = /\b(the|and|of)\b/i.test(p.text) ? "en-US" : "pt-BR";
      utterance.rate = settings.speechRate;
      utterance.onend = next;
      utterance.onerror = () => {
        if (session === speechSession.current) setSpeaking(false);
      };
      setCurrent(p.id);
      speechSynthesis.speak(utterance);
    };
    next();
  };
  const css = {
    "--reading-width": `${settings.width}px`,
    "--reading-size": `${settings.fontSize}px`,
    "--reading-line": settings.lineHeight,
    "--reading-font":
      settings.font === "book"
        ? "'Literata Variable', Georgia, serif"
        : settings.font === "legible"
          ? "'Atkinson Hyperlegible', sans-serif"
          : settings.font === "sans"
            ? "var(--font-sans)"
            : "var(--font-serif)",
  } as CSSProperties;
  const renderParagraph = (p: Paragraph, index: number) => {
    const spans = (
      highlighted.get(p.id) ?? [
        { start: 0, end: p.text.length, text: p.text, mark: undefined },
      ]
    ).map((run) =>
      run.mark ? (
        <mark
          key={run.start}
          style={{
            background: run.mark.color ?? "var(--highlight)",
            color: "#24221d",
          }}
          title="Destaque salvo"
        >
          {run.text}
        </mark>
      ) : (
        run.text
      ),
    );
    const props = {
      id: `paragraph-${p.id}`,
      "data-paragraph": p.id,
      "data-reader-text": p.id,
      className:
        index === 0 && (!p.kind || p.kind === "paragraph") ? "drop-cap" : "",
    };
    if (p.kind === "image" && safeUrl(p.href))
      return (
        <figure id={`paragraph-${p.id}`} data-paragraph={p.id}>
          <img
            src={safeUrl(p.href)}
            alt={p.text}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <figcaption>{p.text}</figcaption>
        </figure>
      );
    if (p.kind === "heading") return <h2 {...props}>{spans}</h2>;
    if (p.kind === "code" || p.kind === "table")
      return (
        <pre {...props} className={`reading-${p.kind}`}>
          {spans}
        </pre>
      );
    if (p.kind === "quote") return <blockquote {...props}>{spans}</blockquote>;
    return (
      <p {...props}>
        {p.kind === "list" ? (
          <span className="list-marker" aria-hidden="true" />
        ) : null}
        {spans}
      </p>
    );
  };
  return (
    <div
      className={`reader-page ${settings.indent ? "reader-indented" : ""}`}
      style={css}
    >
      {settings.minimap && !settings.focus && source.paragraphs.length > 0 && (
        <ReaderMinimap
          source={source}
          marks={sourceMarks}
          current={current}
          goTo={goTo}
        />
      )}
      <div className="reader-topline">
        <button className="text-button" onClick={() => setTab("fontes")}>
          <ArrowLeft size={14} />
          Biblioteca
        </button>
        <div className="reader-actions">
          {source.fileId && /^(PDF|EPUB|DOCX)$/i.test(source.format) && (
            <button
              className="icon-button"
              aria-label="Organizar texto do material"
              title="Organizar texto do material"
              onClick={() => setReorganizing(true)}
            >
              <ScanText size={17} />
            </button>
          )}
          <button
            className="icon-button mobile-map-button"
            aria-label="Mapa da leitura"
            onClick={() => setMapOpen(true)}
          >
            <Map size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Atalhos do leitor"
            onClick={() => setKeys(true)}
          >
            <Keyboard size={17} />
          </button>
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
            <i>{notebookEntries(source.id, marginNotes, notes).length}</i>
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
            disabled={!source.paragraphs.length}
          >
            {speaking ? <VolumeX size={16} /> : <Headphones size={16} />}
          </button>
        </div>
      </div>
      <header className="reader-heading">
        <Overline>
          {source.topic}
          {source.excerptOnly ? " · RECORTES SALVOS" : ""}
        </Overline>
        <h1>{source.title}</h1>
        <div className="reader-description">
          <span>
            {source.author}
            {source.publishedYear ? ` · ${source.publishedYear}` : ""}
            <small>
              {source.readTime} · {source.paragraphs.length} parágrafos
              {source.pages ? ` · ${source.pages} páginas` : ""}
            </small>
          </span>
          <div>
            {safeUrl(source.url) && (
              <a
                className="text-button"
                href={safeUrl(source.url)}
                target="_blank"
                rel="noopener noreferrer"
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
      {speaking && (
        <div className="listen-player">
          <Headphones size={15} />
          <span>Ouvindo ¶{current}</span>
          <button
            aria-label={paused ? "Continuar áudio" : "Pausar áudio"}
            onClick={() => {
              if (paused) speechSynthesis.resume();
              else speechSynthesis.pause();
              setPaused(!paused);
            }}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button onClick={stopSpeech}>Parar</button>
        </div>
      )}
      <section className="reading-brief">
        <button onClick={() => setBrief(!brief)} aria-expanded={brief}>
          <span>
            Visão geral <small>Síntese, argumentos e mapa do texto</small>
          </span>
          <ChevronDown size={15} className={brief ? "rotated" : ""} />
        </button>
        {brief && (
          <div className="brief-content">
            {source.overview ? (
              <>
                <AnswerText
                  text={source.overview.summary}
                  source={source}
                  goTo={goTo}
                />
                <h3>Principais afirmações</h3>
                <ol>
                  {source.overview.claims.map((claim, i) => (
                    <li key={i}>
                      {claim.text}{" "}
                      {claim.paragraphs.map((n) => (
                        <button
                          key={n}
                          className="citation-button"
                          onClick={() => goTo(n)}
                        >
                          [¶{n}]
                        </button>
                      ))}
                    </li>
                  ))}
                </ol>
                <h3>Mapa de leitura</h3>
                <div className="outline-list">
                  {source.overview.sections.map((section, i) => (
                    <button key={i} onClick={() => goTo(section.start)}>
                      <span>{section.title}</span>
                      <small>
                        ¶{section.start}–{section.end}
                      </small>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p>
                  {source.briefSummary ||
                    "Gere uma síntese para localizar as ideias e acompanhar o raciocínio do autor."}
                </p>
                {source.claims.length > 0 && (
                  <ul>
                    {source.claims.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {briefBusy ? (
              <Thinking label="Organizando a visão geral…" />
            ) : (
              <button
                className="text-button"
                disabled={!source.paragraphs.length}
                onClick={() => void generateBrief()}
              >
                {source.overview
                  ? "Atualizar visão geral"
                  : "Gerar visão com referências"}
                <ArrowRight size={13} />
              </button>
            )}
            {briefError && (
              <p className="inline-error" role="alert">
                {briefError}
              </p>
            )}
          </div>
        )}
      </section>
      {source.paragraphs.some((p) => p.kind === "heading") && (
        <details className="chapter-index">
          <summary>
            Sumário do arquivo ·{" "}
            {source.paragraphs.filter((p) => p.kind === "heading").length}{" "}
            títulos
          </summary>
          <nav aria-label="Títulos do material">
            {source.paragraphs
              .filter((p) => p.kind === "heading")
              .map((p) => (
                <button key={p.id} onClick={() => goTo(p.id)}>
                  <span>{p.text}</span>
                  <small>{p.page ? `p. ${p.page}` : `¶${p.id}`}</small>
                </button>
              ))}
          </nav>
        </details>
      )}
      {sourceMarks
        .filter((m) => m.paragraphId === 0)
        .map((mark) => (
          <div className="document-conversation" key={mark.id}>
            <MarginConversation mark={mark} source={source} goTo={goTo} />
          </div>
        ))}
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
                  : "Adicione o arquivo ou cole um recorte para ler aqui."
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
        ref={article}
        style={{ textAlign: settings.align }}
        onMouseUp={capture}
        onTouchEnd={() => requestAnimationFrame(capture)}
      >
        {source.paragraphs.map((p, index) => {
          const marks = sourceMarks.filter(
            (m) => m.paragraphId === p.id && m.type !== "highlight",
          );
          const ownNotes = sourceNotes.filter(
            (n) =>
              n.paragraphId === p.id &&
              !sourceMarks.some((m) => m.noteId === n.id),
          );
          return (
            <section
              className={`reader-row ${current === p.id ? "current-paragraph" : ""}`}
              key={p.id}
            >
              <div className="paragraph-wrap">
                <div className="paragraph-gutter">
                  {settings.numbers && (
                    <button
                      className={marks.length ? "has-margin" : ""}
                      aria-label={`Parágrafo ${p.id}, abrir caderno`}
                      onClick={() => setNotebook(true)}
                    >
                      {String(p.id).padStart(2, "0")}
                    </button>
                  )}
                </div>
                {renderParagraph(p, index)}
                {p.page && (
                  <small className="paragraph-page">
                    PÁGINA {p.page}
                    {p.pageEnd ? `–${p.pageEnd}` : ""}
                  </small>
                )}
              </div>
              <aside className="paragraph-margin" id={`margin-${p.id}`}>
                {marks.map((mark) => (
                  <MarginConversation
                    key={mark.id}
                    mark={mark}
                    source={source}
                    goTo={goTo}
                  />
                ))}
                {thinking === p.id && <Thinking />}
                {ownNotes.map((n) => (
                  <div className="margin-note canonical" key={n.id}>
                    <span>SUA NOTA · ¶{p.id}</span>
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
                {index === 0 && !marks.length && !ownNotes.length && (
                  <p className="margin-hint">
                    Uma margem para pensar.
                    <br />
                    Selecione uma linha, pergunte ou guarde uma ideia.
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
            FIM {source.excerptOnly ? "DOS RECORTES" : "DA LEITURA"} ·{" "}
            {source.title}
          </span>
          <button className="text-button" onClick={() => setNotebook(true)}>
            Abrir seu caderno
            <ArrowRight size={13} />
          </button>
        </footer>
      )}
      <div className="reading-ask">
        <form
          className="ask-bar"
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}
        >
          <input
            ref={questionInput}
            aria-label="Perguntar sobre a leitura"
            value={question}
            maxLength={5000}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pergunte sobre todo o texto…"
          />
          <label className="web-switch" title="Consultar fontes externas">
            <input
              type="checkbox"
              checked={settings.webSearch}
              onChange={(e) => saveSettings({ webSearch: e.target.checked })}
            />{" "}
            Web
          </label>
          <select
            className="depth-select"
            aria-label="Profundidade da resposta"
            value={settings.answerDepth}
            onChange={(e) =>
              saveSettings({ answerDepth: e.target.value as "quick" | "deep" })
            }
          >
            <option value="quick">Rápida</option>
            <option value="deep">Profunda</option>
          </select>
          <button
            className="ask-submit"
            aria-label="Enviar pergunta"
            disabled={!question.trim() || busy || !source.paragraphs.length}
          >
            {busy ? <span className="spinner" /> : <ArrowRight size={17} />}
          </button>
        </form>
        {busy && <Thinking />}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {preferences && <ReaderSettings close={() => setPreferences(false)} />}
      {reorganizing && (
        <ReorganizeSourceModal
          source={source}
          close={() => setReorganizing(false)}
        />
      )}
      {adding && <AddSourceModal onClose={() => setAdding(false)} />}
      {notebook && (
        <ReaderNotebook
          source={source}
          close={() => setNotebook(false)}
          goTo={goTo}
        />
      )}
      {mapOpen && (
        <Modal
          title="Mapa da leitura"
          close={() => setMapOpen(false)}
          className="reader-drawer"
        >
          <p>Toque em um trecho para continuar a leitura.</p>
          <div className="outline-list">
            {source.paragraphs.map((p) => (
              <button
                key={p.id}
                aria-current={current === p.id ? "location" : undefined}
                onClick={() => goTo(p.id)}
              >
                <span>
                  {p.text.slice(0, 100)}
                  {p.text.length > 100 ? "…" : ""}
                </span>
                <small>
                  ¶{p.id}
                  {sourceMarks.some((m) => m.paragraphId === p.id)
                    ? " · anotado"
                    : ""}
                </small>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {keys && (
        <Modal title="Atalhos de leitura" close={() => setKeys(false)}>
          <dl className="keyboard-list">
            {[
              ["Selecionar + digitar", "Perguntar sobre o trecho"],
              ["/", "Perguntar sobre todo o texto"],
              ["J / K", "Próximo / parágrafo anterior"],
              ["Enter", "Selecionar parágrafo atual"],
              ["[ / ]", "Anotação anterior / próxima"],
              ["B", "Abrir visão geral"],
              ["N", "Abrir caderno"],
              ["F", "Alternar foco"],
              ["Esc", "Fechar painel"],
              ["?", "Ver atalhos"],
            ].map(([key, action]) => (
              <div key={key}>
                <dt>
                  <kbd>{key}</kbd>
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      <TranslatorPopup
        key={
          selection
            ? `${selection.sourceId}-${selection.paragraphId}-${selection.start}-${selection.text.length}`
            : "closed"
        }
        onThinking={setThinking}
      />
    </div>
  );
}
