import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  ArrowRight,
  ArrowUpRight,
  Trash2,
  Check,
  NotebookPen,
  Sparkles,
  GitCompareArrows,
  MessageCircle,
  BookOpen,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { useVault } from "@/lib/vault/store";
import { localDay } from "@/lib/vault/model";
import type { Note } from "@/lib/vault/types";
import { assist, type AssistResult } from "@/lib/study/ai";
import { Modal, Empty, Overline } from "./ui";
export function NotesTab() {
  const {
    notes,
    sources,
    selectedNoteId,
    selectNote,
    addNote,
    updateNote,
    deleteNote,
    addCard,
    setActiveSourceId,
    setTab,
  } = useVault((s) => s);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [workbench, setWorkbench] = useState<
    "distill" | "socratic" | "compare" | null
  >(null);
  const [title, setTitle] = useState("");
  const [claims, setClaims] = useState("");
  const [commentary, setCommentary] = useState("");
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [location, setLocation] = useState("");
  const [questions, setQuestions] = useState("");
  const active = notes.find((n) => n.id === selectedNoteId) ?? notes[0];
  const filtered = notes.filter((n) =>
    `${n.title} ${n.content} ${n.tags.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const reset = () => {
    setTitle("");
    setClaims("");
    setCommentary("");
    setQuestions("");
    setLocation("");
    setCreating(true);
  };
  const edit = () => {
    if (!active) return;
    setTitle(active.title);
    setClaims(active.claims.join("\n"));
    setCommentary(active.commentary.join("\n"));
    setQuestions(active.questions.join("\n"));
    setLocation(active.paginas);
    setSourceId(active.fonte);
    setEditing(true);
  };
  const save = () => {
    const source = sources.find((s) => s.id === sourceId);
    if (!source || !title.trim() || !location.trim()) return;
    const data = {
      title: title.trim(),
      content: [claims.trim(), commentary.trim()].filter(Boolean).join("\n\n"),
      claims: claims
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      commentary: commentary
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      questions: questions.split("\n").filter(Boolean),
      fonte: source.id,
      paginas: location,
      tags: [source.topic],
      citation: `${source.author}. ${source.title}, ${location}.`,
    };
    if (editing && active) updateNote(active.id, data);
    else selectNote(addNote(data));
    setCreating(false);
    setEditing(false);
    toast.success("Nota guardada com sua referência.");
  };
  const card = (n: Note) => {
    addCard({
      frente: `O que afirma a fonte na nota “${n.title}”?`,
      verso: n.claims.join("\n") || n.content,
      fonte: n.fonte,
      noteId: n.id,
      tags: n.tags,
      proxima: localDay(),
      qualidade: 1,
      revisoes: 0,
      location: n.paginas,
    });
    toast.success("Cartão adicionado à revisão.");
  };
  return (
    <div className="notes-page">
      <div className="page-heading">
        <div>
          <Overline>IDEIAS QUE MERECEM VOLTAR</Overline>
          <h1>
            Seu caderno<span className="title-period">.</span>
          </h1>
          <p>{notes.length} notas, com as fontes por perto.</p>
        </div>
        <button className="button primary" onClick={reset}>
          <Plus size={15} />
          Nova nota
        </button>
      </div>
      <div className="study-modes">
        <button onClick={() => setWorkbench("distill")}>
          <Sparkles size={17} />
          <span>
            <strong>Destilar</strong>
            <small>Uma leitura, ideias claras.</small>
          </span>
          <ArrowUpRight size={14} />
        </button>
        <button onClick={() => setWorkbench("socratic")}>
          <MessageCircle size={17} />
          <span>
            <strong>Pensar junto</strong>
            <small>Uma pergunta de cada vez.</small>
          </span>
          <ArrowUpRight size={14} />
        </button>
        <button onClick={() => setWorkbench("compare")}>
          <GitCompareArrows size={17} />
          <span>
            <strong>Comparar</strong>
            <small>Vozes e diferenças.</small>
          </span>
          <ArrowUpRight size={14} />
        </button>
      </div>
      {!notes.length ? (
        <Empty
          title="Uma ideia de cada vez."
          text="As notas que você guardar na leitura aparecem aqui."
          action={
            <button className="button" onClick={reset}>
              Criar primeira nota
            </button>
          }
        />
      ) : (
        <div className="notes-layout">
          <aside className="notes-index">
            <label className="notes-search">
              <Search size={14} />
              <input
                aria-label="Buscar notas"
                placeholder="Buscar uma ideia…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="notes-index-list">
              {filtered.map((n) => (
                <button
                  key={n.id}
                  className={active?.id === n.id ? "active" : ""}
                  onClick={() => selectNote(n.id)}
                >
                  <small>
                    {sources.find((s) => s.id === n.fonte)?.author ?? "Fonte"} ·{" "}
                    {n.paginas}
                  </small>
                  <strong>{n.title}</strong>
                  <span>{n.tags[0]}</span>
                </button>
              ))}
              {!filtered.length && (
                <p className="muted">Nenhuma nota nesta busca.</p>
              )}
            </div>
          </aside>
          {active && (
            <article className="canonical-note">
              <div className="note-actions">
                <Overline>NOTA CANÔNICA</Overline>
                <div>
                  <button
                    className="icon-button"
                    aria-label="Editar nota"
                    onClick={edit}
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Remover nota"
                    onClick={() => {
                      if (confirm("Remover esta nota?")) deleteNote(active.id);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <h2>{active.title}</h2>
              <div className="note-tags">
                {active.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              {active.quote && <blockquote>{active.quote}</blockquote>}
              {active.claims.length > 0 && (
                <section>
                  <Overline>O QUE A FONTE AFIRMA</Overline>
                  <ul>
                    {active.claims.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </section>
              )}
              {active.commentary.length > 0 && (
                <section>
                  <Overline>COMENTÁRIO E LIMITES</Overline>
                  {active.commentary.map((c, i) => (
                    <p key={i}>{c}</p>
                  ))}
                </section>
              )}
              {!active.claims.length && !active.commentary.length && (
                <p>{active.content}</p>
              )}
              {active.questions.length > 0 && (
                <section className="open-questions">
                  <Overline>O QUE FICOU EM ABERTO</Overline>
                  {active.questions.map((q, i) => (
                    <p key={i}>{q}</p>
                  ))}
                </section>
              )}
              <footer>
                <Overline>REFERÊNCIA</Overline>
                <p>
                  {active.citation ||
                    `${sources.find((s) => s.id === active.fonte)?.author}. ${sources.find((s) => s.id === active.fonte)?.title}, ${active.paginas}.`}
                </p>
                <div className="button-row">
                  <button
                    className="text-button"
                    onClick={() => {
                      setActiveSourceId(active.fonte);
                      setTab("estudar");
                      if (active.paragraphId)
                        setTimeout(
                          () =>
                            document
                              .querySelector(
                                `[data-paragraph="${active.paragraphId}"]`,
                              )
                              ?.scrollIntoView({ block: "center" }),
                          80,
                        );
                    }}
                  >
                    Voltar à fonte
                    <ArrowUpRight size={14} />
                  </button>
                  <button
                    className="button subtle"
                    onClick={() => card(active)}
                  >
                    <NotebookPen size={14} />
                    Criar cartão
                  </button>
                </div>
              </footer>
            </article>
          )}
        </div>
      )}
      {(creating || editing) && (
        <Modal
          title={editing ? "Editar nota" : "Uma nova ideia"}
          close={() => {
            setCreating(false);
            setEditing(false);
          }}
        >
          <div className="form-stack">
            <label className="field">
              Título
              <input
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Uma ideia por nota"
              />
            </label>
            <div className="field-row">
              <label className="field">
                Fonte
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Página, capítulo ou trecho
                <input
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex.: p. 12 ou § 3"
                />
              </label>
            </div>
            <label className="field">
              Afirmações da fonte
              <textarea
                rows={4}
                value={claims}
                onChange={(e) => setClaims(e.target.value)}
                placeholder="Uma afirmação por linha"
              />
            </label>
            <label className="field">
              Seu comentário
              <textarea
                rows={3}
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                placeholder="Interpretação, limites ou conexões"
              />
            </label>
            <label className="field">
              Perguntas em aberto
              <textarea
                rows={2}
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
              />
            </label>
            <button
              className="button primary"
              onClick={save}
              disabled={
                !title.trim() ||
                !location.trim() ||
                !sourceId ||
                (!claims.trim() && !commentary.trim())
              }
            >
              <Check size={15} />
              Guardar nota
            </button>
          </div>
        </Modal>
      )}
      {workbench && (
        <StudyWorkbench mode={workbench} close={() => setWorkbench(null)} />
      )}
    </div>
  );
}
function StudyWorkbench({
  mode,
  close,
}: {
  mode: "distill" | "socratic" | "compare";
  close: () => void;
}) {
  const { sources, notes, addNote, addCard, addRelation, selectNote, setTab } =
    useVault((s) => s);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [location, setLocation] = useState("");
  const [text, setText] = useState("");
  const [second, setSecond] = useState(notes[1]?.id ?? "");
  const [first, setFirst] = useState(notes[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssistResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [learner, setLearner] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const source = sources.find((s) => s.id === sourceId);
  const available = notes.filter((n) => n.fonte === sourceId);
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      let context = "";
      let prompt = "";
      let label = "";
      if (mode === "distill") {
        context = text;
        prompt =
          "Destile este recorte em uma nota canônica e 3 cartões de revisão. Separe afirmações da fonte e comentários, sem inventar páginas.";
        label = `${source?.author}. ${source?.title}, ${location}.`;
      } else if (mode === "compare") {
        const a = notes.find((n) => n.id === first),
          b = notes.find((n) => n.id === second);
        context = JSON.stringify([a, b]);
        prompt =
          "Compare estas duas notas, preservando a atribuição de cada ideia e as citações. Registre convergências, divergências e limites.";
        label = "Notas canônicas existentes";
      } else {
        context = JSON.stringify(available);
        prompt = history.length
          ? `Conversa anterior:\n${history.join("\n")}\nResposta do estudante: ${learner}\nDê feedback com base nas notas e faça apenas uma nova pergunta.`
          : "Faça uma única pergunta curta sobre estas notas. Não apresente a resposta ainda.";
        label = `Notas existentes de ${source?.title}`;
      }
      const output = await assist(mode, prompt, context, label);
      setResult(output);
      setSaved(false);
      if (mode === "socratic") {
        setHistory((h) => [
          ...h,
          ...(learner ? [`Estudante: ${learner}`] : []),
          `Tutor: ${output.answer}`,
        ]);
        setLearner("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "A IA está indisponível.");
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    if (!result || !source) return;
    const a = notes.find((n) => n.id === first),
      b = notes.find((n) => n.id === second);
    const target = addNote({
      title:
        result.title ??
        (mode === "compare" ? "Comparação de fontes" : "Ideia destilada"),
      content: result.answer,
      claims: result.claims ?? [],
      commentary: result.commentary ?? [result.answer],
      questions: result.questions ?? [],
      citation:
        mode === "compare"
          ? `${a?.citation}\n${b?.citation}`
          : `${source.author}. ${source.title}, ${location}.`,
      fonte: mode === "compare" ? (a?.fonte ?? source.id) : source.id,
      paginas: mode === "compare" ? `${a?.paginas} / ${b?.paginas}` : location,
      tags: [mode === "compare" ? "Comparação" : source.topic],
    });
    if (mode === "distill")
      for (const c of result.cards ?? [])
        addCard({
          frente: c.question,
          verso: c.answer,
          noteId: target,
          fonte: source.id,
          tags: [source.topic],
          location,
          proxima: localDay(),
          qualidade: 1,
          revisoes: 0,
        });
    if (mode === "compare" && a && b)
      addRelation({
        from: a.id,
        to: b.id,
        kind: "relaciona",
        reason: result.answer,
        citation: `${a.citation}\n${b.citation}`,
      });
    selectNote(target);
    setSaved(true);
    toast.success("Estudo guardado no caderno.");
  };
  return (
    <Modal
      title={
        mode === "distill"
          ? "Destilar uma leitura"
          : mode === "socratic"
            ? "Pensar junto"
            : "Comparar fontes"
      }
      close={close}
      wide
    >
      <div className="form-stack">
        {mode === "compare" ? (
          <div className="field-row">
            <label className="field">
              Primeira nota
              <select value={first} onChange={(e) => setFirst(e.target.value)}>
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Segunda nota
              <select
                value={second}
                onChange={(e) => setSecond(e.target.value)}
              >
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <label className="field">
            Fonte
            <select
              value={sourceId}
              disabled={busy}
              onChange={(e) => {
                setSourceId(e.target.value);
                setHistory([]);
                setResult(null);
              }}
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === "distill" && (
          <>
            <label className="field">
              Localização
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Página ou capítulo do recorte"
              />
            </label>
            <label className="field">
              Recorte da fonte
              <textarea
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Trabalhe com uma seção de cada vez."
              />
            </label>
          </>
        )}
        {mode === "socratic" && (
          <>
            <p className="form-intro">
              O tutor usa as notas que já existem. Responda antes de pedir a
              próxima pergunta.
            </p>
            {!available.length && (
              <p className="inline-error">
                Esta fonte ainda não tem notas. Destile um recorte primeiro.
              </p>
            )}
            {result && (
              <div className="workbench-answer">
                <p>{result.answer}</p>
              </div>
            )}
            {history.length > 0 && (
              <label className="field">
                Sua resposta
                <textarea
                  rows={4}
                  value={learner}
                  onChange={(e) => setLearner(e.target.value)}
                  placeholder="Escreva o que você entendeu…"
                />
              </label>
            )}
          </>
        )}
        <button
          className="button primary"
          disabled={
            busy ||
            (mode === "distill" && (!location.trim() || !text.trim())) ||
            (mode === "compare" && (!first || !second || first === second)) ||
            (mode === "socratic" &&
              (!available.length || (history.length > 0 && !learner.trim())))
          }
          onClick={() => void run()}
        >
          <Sparkles size={15} />
          {busy
            ? "Pensando…"
            : mode === "socratic"
              ? history.length
                ? "Enviar resposta"
                : "Começar com uma pergunta"
              : mode === "distill"
                ? "Destilar recorte"
                : "Comparar as notas"}
        </button>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {result && mode !== "socratic" && (
          <div className="workbench-answer">
            <Overline>LEITURA ORGANIZADA</Overline>
            <h3>{result.title}</h3>
            <p>{result.answer}</p>
            {result.claims?.length && (
              <ul>
                {result.claims.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
            {result.commentary?.map((c, i) => (
              <p key={i}>{c}</p>
            ))}
            <button className="button" disabled={saved} onClick={save}>
              <Check size={15} />
              {saved ? "Guardado" : "Guardar nota e relações"}
            </button>
          </div>
        )}
        {mode === "socratic" && history.length > 0 && (
          <button
            className="text-button"
            disabled={saved}
            onClick={() => {
              addNote({
                title: `Sessão de estudo: ${source?.title}`,
                content: history.join("\n\n"),
                fonte: sourceId,
                paginas: "Sessão sobre notas existentes",
                tags: ["Estudo socrático"],
                claims: [],
                commentary: history,
                questions: [],
                citation: available.map((n) => n.citation).join("\n"),
              });
              setSaved(true);
              toast.success("Sessão e respostas guardadas.");
            }}
          >
            Guardar esta sessão
            <Check size={13} />
          </button>
        )}
      </div>
    </Modal>
  );
}
