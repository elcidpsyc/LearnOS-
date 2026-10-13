import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  Library,
  Printer,
  ArrowUpRight,
  BookOpen,
  MoreHorizontal,
  Trash2,
  Download,
  Cloud,
} from "lucide-react";
import { motion } from "framer-motion";
import { useVault } from "@/lib/vault/store";
import { getFile, download, removeFile } from "@/lib/vault/files";
import type { Source } from "@/lib/vault/types";
import { toast } from "sonner";
import { AddSourceModal } from "./add-source-modal";
import { GlossEditionModal } from "./gloss-edition-modal";
import { Empty, Overline, Modal } from "./ui";
export function SourcesTab() {
  const {
    sources,
    notes,
    marginNotes,
    shelfFilter,
    setShelfFilter,
    shelfSort,
    setShelfSort,
    setActiveSourceId,
    setTab,
    settings,
    deleteSource,
    setSettingsOpen,
  } = useVault((s) => s);
  const [view, setView] = useState<"shelf" | "topics" | "list">("shelf");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [edition, setEdition] = useState(false);
  const [details, setDetails] = useState<Source | null>(null);
  const topics = useMemo(
    () => [...new Set(sources.map((s) => s.topic))].sort(),
    [sources],
  );
  const filtered = useMemo(
    () =>
      sources
        .filter(
          (s) =>
            (shelfFilter === "all" ||
              (shelfFilter === "agent"
                ? s.origin === "agent"
                : s.topic === shelfFilter)) &&
            `${s.title} ${s.author} ${s.topic}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          shelfSort === "topic"
            ? a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title)
            : shelfSort === "length"
              ? parseInt(a.readTime) - parseInt(b.readTime)
              : b.createdAt.localeCompare(a.createdAt) ||
                a.title.localeCompare(b.title),
        ),
    [sources, shelfFilter, query, shelfSort],
  );
  const open = (s: Source) => {
    setActiveSourceId(s.id);
    setTab("estudar");
  };
  const readingMinutes = sources.reduce(
    (n, s) => n + (parseInt(s.readTime) || 0),
    0,
  );
  const agentCount = sources.filter((s) => s.origin === "agent").length;
  return (
    <div className="library-page">
      <div className="page-heading library-heading">
        <div>
          <Overline>UM LUGAR PARA O QUE FICA</Overline>
          <h1>
            {settings.displayName || "Minha biblioteca"}
            <span className="title-period">.</span>
          </h1>
          <p className="library-meta">
            <span>{sources.length} fontes</span>
            <i />
            <span>{topics.length} temas</span>
            <i />
            <span>
              {readingMinutes >= 60
                ? `${Math.floor(readingMinutes / 60)} h ${readingMinutes % 60} min`
                : `${readingMinutes} min`}{" "}
              de leitura
            </span>
          </p>
        </div>
        <div className="heading-actions">
          <button className="button subtle" onClick={() => setEdition(true)}>
            <Printer size={15} />
            <span>Minha edição</span>
          </button>
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={16} />
            Adicionar fonte
          </button>
        </div>
      </div>
      {agentCount > 0 && (
        <button
          className="agent-notice"
          onClick={() => setShelfFilter("agent")}
        >
          <span className="agent-dot" />
          {agentCount}{" "}
          {agentCount === 1 ? "fonte recebida" : "fontes recebidas"} de seus
          agentes
          <ArrowUpRight size={14} />
        </button>
      )}
      <div className="library-controls">
        <div className="segmented">
          <button
            className={view === "shelf" ? "active" : ""}
            onClick={() => setView("shelf")}
          >
            <Library size={14} />
            Estante
          </button>
          <button
            className={view === "topics" ? "active" : ""}
            onClick={() => setView("topics")}
          >
            <LayoutGrid size={14} />
            Temas
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            Lista
          </button>
        </div>
        <label className="library-search">
          <Search size={15} />
          <input
            aria-label="Buscar na biblioteca"
            placeholder="Buscar na biblioteca"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>/</kbd>
        </label>
        <label className="sort-control">
          Organizar
          <select
            aria-label="Ordenar biblioteca"
            value={shelfSort}
            onChange={(e) => setShelfSort(e.target.value as typeof shelfSort)}
          >
            <option value="recent">Recentes</option>
            <option value="topic">Tema</option>
            <option value="length">Tempo de leitura</option>
          </select>
        </label>
      </div>
      <div className="topic-filters">
        <button
          className={shelfFilter === "all" ? "active" : ""}
          onClick={() => setShelfFilter("all")}
        >
          Todas <span>{sources.length}</span>
        </button>
        {topics.map((t) => (
          <button
            key={t}
            className={shelfFilter === t ? "active" : ""}
            onClick={() => setShelfFilter(t)}
          >
            <i
              style={{
                background: sources.find((s) => s.topic === t)?.spineColor,
              }}
            />
            {t}
            <span>{sources.filter((s) => s.topic === t).length}</span>
          </button>
        ))}
        {agentCount > 0 && (
          <button
            className={shelfFilter === "agent" ? "active" : ""}
            onClick={() => setShelfFilter("agent")}
          >
            Dos agentes <span>{agentCount}</span>
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <Empty
          title="Um espaço para a próxima leitura."
          text="Tente outro filtro ou adicione uma fonte à sua biblioteca."
          action={
            <button className="button" onClick={() => setAdding(true)}>
              <Plus size={15} />
              Adicionar fonte
            </button>
          }
        />
      ) : view === "shelf" ? (
        <>
          <section className="bookshelf" aria-label="Estante de fontes">
            <div className="shelf-books">
              {filtered.map((s, i) => (
                <div className="book-item" key={s.id}>
                  <motion.button
                    className="book-spine"
                    onClick={() => open(s)}
                    whileHover={{ y: -12, rotate: -1.5 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={`Ler ${s.title}`}
                    style={{
                      height: s.spineHeight + 36,
                      width: s.spineWidth + 10,
                      background: s.spineColor,
                      color: s.spineTextColor,
                    }}
                  >
                    <span className="spine-edge" />
                    <span className="spine-emblem">
                      {s.format === "PDF"
                        ? "¶"
                        : s.format === "EPUB"
                          ? "❧"
                          : "✦"}
                    </span>
                    <span className="spine-title">{s.title}</span>
                    <span className="spine-author">
                      {s.author.split(",")[0].split(" ").at(-1)}
                    </span>
                    <span
                      className="book-progress"
                      style={{ height: `${s.progress}%` }}
                    />
                  </motion.button>
                  <div className="book-preview">
                    <span>{s.topic}</span>
                    <strong>{s.title}</strong>
                    <small>
                      {s.author} · {s.readTime}
                    </small>
                    <button onClick={() => setDetails(s)}>
                      Detalhes da fonte
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="shelf-ledge" />
          </section>
          <div className="shelf-caption">
            <span>Escolha uma lombada. Cada leitura abre uma nova margem.</span>
            <span>
              {filtered.length} {filtered.length === 1 ? "fonte" : "fontes"}{" "}
              nesta estante
            </span>
          </div>
        </>
      ) : view === "topics" ? (
        <div className="topic-grid">
          {[...new Set(filtered.map((s) => s.topic))].map((t) => {
            const collection = filtered.filter((s) => s.topic === t);
            return (
              <button
                key={t}
                className="topic-card"
                onClick={() => {
                  setShelfFilter(t);
                  setView("shelf");
                }}
              >
                <div
                  className="topic-art"
                  style={{ color: collection[0].spineColor }}
                >
                  <BookOpen size={76} strokeWidth={0.75} />
                  <div className="mini-shelf">
                    {collection.map((s) => (
                      <i
                        key={s.id}
                        style={{
                          height: s.spineHeight / 4,
                          background: s.spineColor,
                          width: s.spineWidth / 3,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span className="topic-card-caption">
                  <strong>{t}</strong>
                  <small>
                    {collection.length} fontes ·{" "}
                    {collection.reduce(
                      (n, s) => n + (parseInt(s.readTime) || 0),
                      0,
                    )}{" "}
                    min
                  </small>
                  <ArrowUpRight size={16} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="source-table">
          {filtered.map((s) => (
            <div key={s.id} className="source-row">
              <button className="source-row-main" onClick={() => open(s)}>
                <span
                  className="source-mini-book"
                  style={{ background: s.spineColor }}
                />
                <span>
                  <strong>{s.title}</strong>
                  <small>
                    {s.author} · {s.topic}
                  </small>
                </span>
              </button>
              <span className="source-time">{s.readTime}</span>
              <span className="source-format">{s.format}</span>
              <button
                className="icon-button"
                aria-label={`Detalhes de ${s.title}`}
                onClick={() => setDetails(s)}
              >
                <MoreHorizontal size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="library-bottom">
        <div className="library-bottom-copy">
          <Overline>LEITURA, PENSAMENTO, MEMÓRIA.</Overline>
          <p>
            {notes.length} notas e {marginNotes.length} marcações guardadas.
            <br />O que você leu pode continuar conversando com você.
          </p>
        </div>
        <button
          className="library-connect"
          onClick={() => setSettingsOpen(true)}
        >
          <Cloud size={20} strokeWidth={1.2} />
          <span>
            <strong>Seu espaço, conectado.</strong>
            <small>Leve a biblioteca ao tablet e aos seus agentes.</small>
          </span>
          <ArrowUpRight size={18} />
        </button>
      </div>
      {adding && <AddSourceModal onClose={() => setAdding(false)} />}{" "}
      {edition && <GlossEditionModal onClose={() => setEdition(false)} />}
      {details && (
        <Modal title="Sobre esta fonte" close={() => setDetails(null)}>
          <div className="form-stack">
            <Overline>
              {details.format} ·{" "}
              {details.origin === "example" ? "EXEMPLO" : details.topic}
            </Overline>
            <h3>{details.title}</h3>
            <p>
              {details.author}
              {details.publishedYear ? ` · ${details.publishedYear}` : ""}
            </p>
            <p>
              {details.paragraphs.length} trechos · {details.progress}% lido
            </p>
            {details.excerptOnly && (
              <p className="form-intro">
                Esta fonte contém recortes salvos, sem o arquivo integral da
                obra.
              </p>
            )}
            {details.url && (
              <a
                className="text-button"
                href={details.url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir original
                <ArrowUpRight size={14} />
              </a>
            )}
            <div className="button-row">
              <button
                className="button"
                onClick={() => {
                  open(details);
                  setDetails(null);
                }}
              >
                Ler agora
              </button>
              {details.fileId && (
                <button
                  className="button subtle"
                  onClick={() =>
                    void getFile(details.fileId!).then((f) => {
                      if (f) download(f, details.fileName ?? details.title);
                      else
                        toast.error(
                          "O arquivo original não está neste aparelho.",
                        );
                    })
                  }
                >
                  <Download size={15} />
                  Baixar arquivo
                </button>
              )}
            </div>
            <button
              className="text-button danger"
              onClick={() => {
                if (confirm("Remover esta fonte e suas notas e cartões?")) {
                  deleteSource(details.id);
                  if (details.fileId) void removeFile(details.fileId);
                  setDetails(null);
                }
              }}
            >
              <Trash2 size={14} />
              Remover fonte
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
