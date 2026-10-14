import { useRef, useState } from "react";
import { ArrowRight, Download, Folder, RotateCcw } from "lucide-react";
import { useVault } from "@/lib/vault/store";
import { localDay } from "@/lib/vault/model";
import { parseBookmarkText, type Bookmark } from "@/lib/study/bookmarks";
import { importLink } from "@/lib/study/import";
import { Modal, Overline } from "./ui";

export function DailyHighlights() {
  const {
    marginNotes,
    sources,
    updateMarginNote,
    setActiveSourceId,
    setTab,
    updateSource,
  } = useVault((s) => s);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const due = marginNotes
    .filter(
      (m) =>
        m.type === "highlight" &&
        m.quote &&
        (!m.reviewDate || m.reviewDate <= localDay()),
    )
    .sort((a, b) =>
      (a.reviewDate ?? a.createdAt).localeCompare(b.reviewDate ?? b.createdAt),
    )
    .slice(0, 5);
  const mark = due[0];
  const source = sources.find((s) => s.id === mark?.sourceId);
  if (!mark || !source) return null;
  const schedule = (remembered: boolean) => {
    const interval = remembered
      ? Math.max(3, (mark.reviewInterval ?? 1) * 2)
      : 1;
    const date = new Date();
    date.setDate(date.getDate() + interval);
    updateMarginNote(mark.id, {
      reviewDate: localDay(date),
      reviewInterval: interval,
      reviewCount: (mark.reviewCount ?? 0) + 1,
      reviewAnswer: answer,
    });
    setRevealed(false);
    setAnswer("");
  };
  return (
    <section className="daily-highlight">
      <div>
        <Overline>UMA IDEIA PARA REENCONTRAR · {due.length} PARA HOJE</Overline>
        <h2>O que este trecho significa para você?</h2>
        <blockquote>{mark.quote}</blockquote>
        <small>
          {source.title} · ¶{mark.paragraphId}
        </small>
      </div>
      <div className="daily-response">
        <textarea
          aria-label="Sua explicação do destaque"
          rows={2}
          placeholder="Explique com suas palavras…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        {revealed ? (
          <>
            <p>
              Compare sua explicação com o contexto do autor. Você consegue dar
              um exemplo?
            </p>
            <div className="button-row">
              <button className="button subtle" onClick={() => schedule(false)}>
                Rever amanhã
              </button>
              <button className="button" onClick={() => schedule(true)}>
                Lembrei bem
              </button>
            </div>
          </>
        ) : (
          <button className="text-button" onClick={() => setRevealed(true)}>
            Refletir e agendar revisão
            <RotateCcw size={13} />
          </button>
        )}
        <button
          className="text-button"
          onClick={() => {
            updateSource(source.id, { lastParagraph: mark.paragraphId });
            setActiveSourceId(source.id);
            setTab("estudar");
          }}
        >
          Voltar ao contexto
          <ArrowRight size={13} />
        </button>
      </div>
    </section>
  );
}
export function BookmarkImport({ close }: { close: () => void }) {
  const { addSource } = useVault((s) => s);
  const [items, setItems] = useState<Bookmark[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("Sem categoria");
  const [folder, setFolder] = useState("Bookmarks");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<
    { title: string; ok: boolean; message: string }[]
  >([]);
  const cancel = useRef(false);
  const load = (value: string) => {
    try {
      const parsed = parseBookmarkText(value);
      setItems(parsed);
      setSelected(new Set(parsed.slice(0, 20).map((b) => b.url)));
      setError(
        parsed.length ? "" : "Não encontrei links válidos neste arquivo.",
      );
      setResults([]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível ler o arquivo.",
      );
    }
  };
  const run = async () => {
    setBusy(true);
    setError("");
    setResults([]);
    cancel.current = false;
    const batch = items.filter((b) => selected.has(b.url));
    for (let i = 0; i < batch.length && !cancel.current; i++) {
      const item = batch[i];
      setProgress(`${i + 1}/${batch.length} · ${item.title}`);
      try {
        const draft = await importLink(item.url, topic);
        addSource({ ...draft, folder: folder.trim() });
        setResults((r) => [
          ...r,
          { title: item.title, ok: true, message: "Salvo" },
        ]);
      } catch (e) {
        setResults((r) => [
          ...r,
          {
            title: item.title,
            ok: false,
            message:
              e instanceof Error ? e.message : "Não foi possível importar.",
          },
        ]);
      }
    }
    setBusy(false);
    setProgress("");
  };
  return (
    <Modal
      title="Importar bookmarks"
      close={() => {
        cancel.current = true;
        close();
      }}
      wide
    >
      <div className="form-stack">
        <p className="form-intro">
          Abra um export de Pocket, Instapaper ou Raindrop em HTML, CSV ou JSON,
          ou cole uma lista de links. Confira a seleção antes de importar.
        </p>
        <label className="field">
          Arquivo de bookmarks
          <input
            disabled={busy}
            type="file"
            accept=".html,.htm,.csv,.json,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 5 * 1024 * 1024) {
                  setError("Use um export de até 5 MB.");
                  return;
                }
                void file.text().then(load);
              }
            }}
          />
        </label>
        <label className="field">
          Lista de links
          <textarea
            rows={3}
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <button
          className="button subtle"
          disabled={busy || !text.trim()}
          onClick={() => load(text)}
        >
          Conferir links
        </button>
        {items.length > 0 && (
          <>
            <div className="field-row">
              <label className="field">
                Tema
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </label>
              <label className="field">
                Pasta
                <input
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                />
              </label>
            </div>
            <small>
              {items.length} links encontrados. Até 20 por lote, respeitando o
              limite de importação do espaço.
            </small>
            <div className="bookmark-list">
              {items.map((item) => (
                <label key={item.url}>
                  <input
                    type="checkbox"
                    disabled={
                      busy || (!selected.has(item.url) && selected.size >= 20)
                    }
                    checked={selected.has(item.url)}
                    onChange={(e) =>
                      setSelected((previous) => {
                        const next = new Set(previous);
                        if (e.target.checked) next.add(item.url);
                        else next.delete(item.url);
                        return next;
                      })
                    }
                  />
                  <span>
                    {item.title}
                    <small>{item.url}</small>
                  </span>
                </label>
              ))}
            </div>
            <button
              className="button primary"
              disabled={busy || selected.size === 0}
              onClick={() => void run()}
            >
              {busy ? progress : `Importar ${selected.size} links`}
            </button>
          </>
        )}
        {busy && (
          <button
            className="text-button"
            onClick={() => {
              cancel.current = true;
            }}
          >
            Parar após o link atual
          </button>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div aria-live="polite">
          {results.map((r, i) => (
            <p key={i} className={r.ok ? "import-success" : "inline-error"}>
              {r.title}: {r.message}
            </p>
          ))}
        </div>
      </div>
    </Modal>
  );
}
