import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Copy, Download, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AnswerReference, MarginNote, Source } from "@/lib/vault/types";
import { useVault } from "@/lib/vault/store";
import { assist, type AssistMode } from "@/lib/study/ai";
import {
  anchorsFor,
  notebookEntries,
  notebookMarkdown,
  readingContext,
  safeUrl,
} from "@/lib/study/reader";
import { download } from "@/lib/vault/files";
import { Empty, Modal, Overline } from "./ui";

export function Thinking({
  label = "Pensando junto com o texto…",
}: {
  label?: string;
}) {
  return (
    <div className="reading-skeleton" role="status" aria-live="polite">
      <span>{label}</span>
      <i />
      <i />
      <i />
    </div>
  );
}
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado.");
  } catch {
    toast.error("Não foi possível copiar. Use a opção de baixar.");
  }
}
export function AnswerText({
  text,
  source,
  references = [],
  goTo,
  comparisonSourceId,
}: {
  text: string;
  source: Source;
  references?: AnswerReference[];
  goTo: (id: number) => void;
  comparisonSourceId?: string;
}) {
  const { sources, navigateToParagraph } = useVault((s) => s);
  const secondary = sources.find((s) => s.id === comparisonSourceId);
  const parts: ReactNode[] = [];
  const pattern = /\[(?:¶|§\s*)(\d+)\]|\[(\d+)\]|\[([AB])¶(\d+)\]/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(cursor, match.index));
    if (
      match[3] &&
      (match[3] === "A" ? source : secondary)?.paragraphs.some(
        (p) => p.id === Number(match[4]),
      )
    )
      parts.push(
        <button
          key={match.index}
          className="citation-button"
          onClick={() => {
            if (match[3] === "A") goTo(Number(match[4]));
            else if (secondary) {
              navigateToParagraph(secondary.id, Number(match[4]));
            }
          }}
        >
          {match[0]}
        </button>,
      );
    else if (
      match[1] &&
      source.paragraphs.some((p) => p.id === Number(match[1]))
    )
      parts.push(
        <button
          className="citation-button"
          key={match.index}
          onClick={() => goTo(Number(match[1]))}
          title={`Voltar ao parágrafo ${match[1]}`}
        >
          {match[0]}
        </button>,
      );
    else if (match[2] && safeUrl(references[Number(match[2]) - 1]?.url))
      parts.push(
        <a
          className="citation-button"
          key={match.index}
          href={safeUrl(references[Number(match[2]) - 1].url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[0]}
        </a>,
      );
    else parts.push(match[0]);
    cursor = match.index! + match[0].length;
  }
  parts.push(text.slice(cursor));
  return <div className="answer-text">{parts}</div>;
}
export function ResearchSources({
  references = [],
}: {
  references?: AnswerReference[];
}) {
  return references.length > 0 ? (
    <details className="answer-sources">
      <summary>{references.length} fontes consultadas</summary>
      <ol>
        {references.map((r, i) =>
          safeUrl(r.url) ? (
            <li key={i}>
              <a
                href={safeUrl(r.url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {r.title}
              </a>
            </li>
          ) : null,
        )}
      </ol>
    </details>
  ) : null;
}
export function MarginConversation({
  mark,
  source,
  goTo,
}: {
  mark: MarginNote;
  source: Source;
  goTo: (id: number) => void;
}) {
  const { settings, sources, updateMarginNote, updateNote, deleteMarginNote } =
    useVault((s) => s);
  const [followup, setFollowup] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mark.content);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const run = async (regenerate = false) => {
    if (busy) return;
    const conversation = mark.conversation ?? [
      { role: "user" as const, content: mark.title, createdAt: mark.createdAt },
      {
        role: "assistant" as const,
        content: mark.content,
        createdAt: mark.updatedAt,
      },
    ];
    const lastUser = conversation.map((t) => t.role).lastIndexOf("user");
    const prompt = regenerate
      ? conversation[lastUser]?.content
      : followup.trim();
    if (!prompt) return;
    const history = regenerate ? conversation.slice(0, lastUser) : conversation;
    setBusy(true);
    setError("");
    request.current = new AbortController();
    try {
      const second = sources.find((s) => s.id === mark.comparisonSourceId);
      const context = readingContext(
        source,
        anchorsFor(mark, source).map((a) => a.paragraphId),
        second ? 38000 : 78000,
      );
      if (second)
        context.text = `FONTE A: ${source.title}\n${context.text.replace(/\[¶(\d+)\]/g, "[A¶$1]")}\n\nFONTE B: ${second.title}\n${readingContext(second, [], 38000).text.replace(/\[¶(\d+)\]/g, "[B¶$1]")}\nCite [A¶n] e [B¶n], sem omitir a letra da fonte.`;
      const result = await assist(
        regenerate ? (mark.action as AssistMode) || "ask" : "ask",
        `${prompt}${mark.quote ? `\n\nTRECHO SELECIONADO:\n${mark.quote}` : ""}`.slice(
          0,
          12000,
        ),
        context.text,
        `${source.author}. ${source.title}. Trecho: ${mark.quote ?? "material inteiro"}`.slice(
          0,
          3000,
        ),
        { history, web: settings.webSearch, signal: request.current.signal },
      );
      const stamp = new Date().toISOString();
      updateMarginNote(mark.id, {
        content: result.answer,
        model: result.model,
        references: result.references,
        conversation: [
          ...history,
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
      setFollowup("");
    } catch (e) {
      if (!request.current.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Não foi possível responder.",
        );
    } finally {
      setBusy(false);
    }
  };
  const isConversation = ["qa", "explain"].includes(mark.type);
  return (
    <details
      className="margin-note conversation-card"
      open
      id={`annotation-${mark.id}`}
    >
      <summary>
        <span>
          {isConversation
            ? "CONVERSA"
            : mark.type === "reminder"
              ? "LEMBRETE"
              : "SUA NOTA"}{" "}
          · {mark.paragraphId ? `¶${mark.paragraphId}` : "TEXTO INTEIRO"}
        </span>
        <span>⌄</span>
      </summary>
      {mark.quote && (
        <button className="quote-anchor" onClick={() => goTo(mark.paragraphId)}>
          <blockquote>{mark.quote}</blockquote>
        </button>
      )}
      {isConversation && mark.conversation?.length ? (
        <div className="conversation-turns">
          {mark.conversation.map((turn, i) => (
            <div key={i} className={`conversation-turn ${turn.role}`}>
              <small>{turn.role === "user" ? "Você" : "LearnOS"}</small>
              <AnswerText
                text={turn.content}
                source={source}
                references={turn.references}
                goTo={goTo}
                comparisonSourceId={mark.comparisonSourceId}
              />
              <ResearchSources references={turn.references} />
            </div>
          ))}
        </div>
      ) : (
        <AnswerText
          text={mark.content}
          source={source}
          references={mark.references}
          goTo={goTo}
          comparisonSourceId={mark.comparisonSourceId}
        />
      )}
      {mark.reminder && (
        <small>Rever em {mark.reminder.split("-").reverse().join("/")}</small>
      )}
      {mark.model && <small className="answer-model">{mark.model}</small>}
      {busy && <Thinking />}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <div className="form-stack">
          <textarea
            aria-label="Editar anotação"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
          />
          <button
            className="button"
            disabled={!draft.trim()}
            onClick={() => {
              updateMarginNote(mark.id, { content: draft.trim() });
              if (mark.noteId)
                updateNote(mark.noteId, {
                  content: draft.trim(),
                  commentary: [draft.trim()],
                });
              setEditing(false);
            }}
          >
            Salvar nota
          </button>
        </div>
      )}
      <div className="margin-tools">
        <button
          aria-label="Copiar anotação"
          title="Copiar"
          onClick={() =>
            void copyText(
              mark.conversation
                ?.map(
                  (t) =>
                    `${t.role === "user" ? "Você" : "LearnOS"}: ${t.content}`,
                )
                .join("\n\n") ?? mark.content,
            )
          }
        >
          <Copy size={13} />
        </button>
        {isConversation ? (
          <button
            disabled={busy}
            aria-label="Gerar resposta novamente"
            title="Gerar novamente"
            onClick={() => void run(true)}
          >
            <RotateCcw size={13} />
          </button>
        ) : (
          <button onClick={() => setEditing(!editing)}>Editar</button>
        )}
        <button
          aria-label="Remover anotação"
          title="Remover"
          disabled={busy}
          onClick={() => deleteMarginNote(mark.id)}
        >
          <Trash2 size={13} />
        </button>
      </div>
      {isConversation && (
        <form
          className="followup-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <input
            aria-label="Continuar conversa sobre o trecho"
            placeholder="Continue a conversa…"
            value={followup}
            maxLength={5000}
            onChange={(e) => setFollowup(e.target.value)}
          />
          <button
            disabled={busy || !followup.trim()}
            aria-label="Enviar continuação"
          >
            <ArrowRight size={14} />
          </button>
        </form>
      )}
    </details>
  );
}
export function ReaderMinimap({
  source,
  marks,
  current,
  goTo,
}: {
  source: Source;
  marks: MarginNote[];
  current: number;
  goTo: (id: number) => void;
}) {
  const buckets = Math.max(1, Math.ceil(source.paragraphs.length / 140));
  const marked = new Set(
    marks.flatMap((m) =>
      anchorsFor(m, source)
        .map((a) => a.paragraphId)
        .concat(m.paragraphId),
    ),
  );
  const currentIndex = Math.max(
    0,
    source.paragraphs.findIndex((p) => p.id === current),
  );
  return (
    <nav className="reader-minimap" aria-label="Mapa do documento">
      <input
        type="range"
        aria-label="Posição no documento"
        min={0}
        max={Math.max(0, source.paragraphs.length - 1)}
        value={currentIndex}
        onChange={(e) => goTo(source.paragraphs[Number(e.target.value)].id)}
      />
      <div className="minimap-lines">
        {source.paragraphs
          .filter((_, i) => i % buckets === 0)
          .map((p, i) => {
            const group = source.paragraphs.slice(
              i * buckets,
              (i + 1) * buckets,
            );
            return (
              <button
                key={p.id}
                aria-label={`Ir ao parágrafo ${p.id}${group.some((p) => marked.has(p.id)) ? ", com anotações" : ""}`}
                aria-current={
                  group.some((p) => p.id === current) ? "location" : undefined
                }
                className={group.some((p) => marked.has(p.id)) ? "marked" : ""}
                onClick={() => goTo(p.id)}
                style={{ width: `${Math.min(100, 30 + p.text.length / 12)}%` }}
                title={`¶${p.id}`}
              />
            );
          })}
      </div>
      <span>¶{current}</span>
    </nav>
  );
}
export function ReaderNotebook({
  source,
  close,
  goTo,
}: {
  source: Source;
  close: () => void;
  goTo: (id: number) => void;
}) {
  const { marginNotes, notes, deleteMarginNote, deleteNote } = useVault(
    (s) => s,
  );
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const entries = notebookEntries(source.id, marginNotes, notes);
  const markdown = () => notebookMarkdown(source, marginNotes, notes);
  return (
    <Modal
      title={`Caderno · ${source.title}`}
      close={close}
      className="reader-drawer"
    >
      <div className="notebook-toolbar">
        <span>{entries.length} registros</span>
        <button
          className="icon-button"
          aria-label="Copiar caderno"
          onClick={() => void copyText(markdown())}
        >
          <Copy size={16} />
        </button>
        <button
          className="icon-button"
          aria-label="Baixar caderno em Markdown"
          onClick={() =>
            download(
              new Blob([markdown()], { type: "text/markdown;charset=utf-8" }),
              `${source.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 100)}.md`,
            )
          }
        >
          <Download size={16} />
        </button>
      </div>
      <div className="segmented notebook-filters">
        {[
          ["all", "Tudo"],
          ["question", "Perguntas"],
          ["highlight", "Destaques"],
          ["note", "Notas"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}{" "}
            <small>
              {entries.filter((e) => id === "all" || e.kind === id).length}
            </small>
          </button>
        ))}
      </div>
      <label className="field">
        <input
          aria-label="Buscar neste caderno"
          placeholder="Buscar neste caderno…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="notebook-list">
        {entries
          .filter(
            (e) =>
              (filter === "all" || e.kind === filter) &&
              `${e.title} ${e.content} ${e.quote} ${e.mark?.conversation?.map((t) => t.content).join(" ") ?? ""}`
                .toLocaleLowerCase()
                .includes(query.toLocaleLowerCase()),
          )
          .map((entry) => (
            <section key={entry.id} className="notebook-entry">
              <Overline>
                {entry.kind === "highlight"
                  ? "DESTAQUE"
                  : entry.kind === "question"
                    ? "PERGUNTA"
                    : "NOTA"}{" "}
                ·{" "}
                {entry.paragraphId
                  ? `¶${entry.paragraphId}`
                  : "MATERIAL INTEIRO"}
              </Overline>
              {entry.quote && (
                <blockquote style={{ borderColor: entry.mark?.color }}>
                  {entry.quote}
                </blockquote>
              )}
              {entry.kind !== "highlight" && (
                <>
                  <h3>{entry.title}</h3>
                  {entry.mark?.conversation?.length ? (
                    entry.mark.conversation.map((t, i) => (
                      <div className={`conversation-turn ${t.role}`} key={i}>
                        <small>{t.role === "user" ? "Você" : "LearnOS"}</small>
                        <AnswerText
                          text={t.content}
                          source={source}
                          references={t.references}
                          goTo={goTo}
                          comparisonSourceId={entry.mark?.comparisonSourceId}
                        />
                        <ResearchSources references={t.references} />
                      </div>
                    ))
                  ) : (
                    <AnswerText
                      text={entry.content}
                      source={source}
                      goTo={goTo}
                    />
                  )}
                </>
              )}
              <div className="button-row">
                {entry.paragraphId ? (
                  <button
                    className="text-button"
                    onClick={() => goTo(entry.paragraphId!)}
                  >
                    Voltar ao trecho <ArrowRight size={13} />
                  </button>
                ) : null}
                <button
                  className="icon-button"
                  aria-label="Remover registro do caderno"
                  onClick={() =>
                    entry.mark
                      ? deleteMarginNote(entry.id)
                      : deleteNote(entry.id)
                  }
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </section>
          ))}
        {!entries.length && (
          <Empty
            title="Um caderno para este material."
            text="Selecione um trecho para guardar uma ideia, destacar ou conversar."
          />
        )}
      </div>
    </Modal>
  );
}
