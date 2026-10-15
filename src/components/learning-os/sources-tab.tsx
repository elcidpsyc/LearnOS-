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
  Folder,
  ScanText,
} from "lucide-react";
import { useVault, snapshot } from "@/lib/vault/store";
import { exportNotebooks, readingContext } from "@/lib/study/reader";
import { assist } from "@/lib/study/ai";
import { DailyHighlights, BookmarkImport } from "./library-extras";
import { getFile, download, removeFile } from "@/lib/vault/files";
import type { Source } from "@/lib/vault/types";
import { toast } from "sonner";
import { AddSourceModal } from "./add-source-modal";
import { GlossEditionModal } from "./gloss-edition-modal";
import { Empty, Overline, Modal } from "./ui";
import { SourceObject, FolderObject } from "./library-objects";
import { ReorganizeSourceModal } from "./file-import-panel";
const folderPath = (s: Source) =>
  (s.folder ?? "")
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" / ");
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
    updateSource,
  } = useVault((s) => s);
  const [view, setView] = useState<
    "shelf" | "covers" | "topics" | "folders" | "list"
  >("covers");
  const [reorganizing, setReorganizing] = useState<Source | null>(null);
  const [folder, setFolder] = useState("");
  const [bookmarks, setBookmarks] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
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
            (!folder ||
              folderPath(s) === folder ||
              folderPath(s).startsWith(folder + " / ")) &&
            `${s.title} ${s.author} ${s.topic} ${(s.tags ?? []).join(" ")} ${notes
              .filter((n) => n.fonte === s.id)
              .map((n) => `${n.title} ${n.content}`)
              .join(" ")} ${marginNotes
              .filter((m) => m.sourceId === s.id)
              .map(
                (m) =>
                  `${m.quote ?? ""} ${m.content} ${m.conversation?.map((t) => t.content).join(" ") ?? ""}`,
              )
              .join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          shelfSort === "color"
            ? a.spineColor.localeCompare(b.spineColor)
            : shelfSort === "reading"
              ? (b.lastReadAt ?? "").localeCompare(a.lastReadAt ?? "")
              : shelfSort === "topic"
                ? a.topic.localeCompare(b.topic) ||
                  a.title.localeCompare(b.title)
                : shelfSort === "length"
                  ? parseInt(a.readTime) - parseInt(b.readTime)
                  : b.createdAt.localeCompare(a.createdAt) ||
                    a.title.localeCompare(b.title),
        ),
    [sources, notes, marginNotes, folder, shelfFilter, query, shelfSort],
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
  const recent = [...sources].sort((a, b) =>
    (b.lastReadAt ?? b.createdAt).localeCompare(a.lastReadAt ?? a.createdAt),
  );
  const featured = recent[0];
  const childFolders = [
    ...new Set(
      filtered
        .map(folderPath)
        .filter((p) => p && (!folder || p.startsWith(folder + " / ")))
        .map((p) => {
          const parts = p.split(" / ");
          return parts
            .slice(0, folder ? folder.split(" / ").length + 1 : 1)
            .join(" / ");
        }),
    ),
  ].sort();
  const folderSources = filtered.filter((s) => folderPath(s) === folder);
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
          <button className="button subtle" onClick={() => setBookmarks(true)}>
            Bookmarks
          </button>
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
      <DailyHighlights />
      {!!sources.length && (
        <section
          className="library-showcase"
          aria-label="Em destaque na biblioteca"
        >
          <div className="showcase-copy">
            <Overline>
              {featured.lastReadAt
                ? "CONTINUE SUA LEITURA"
                : "SUA BIBLIOTECA, VIVA"}
            </Overline>
            <h2>Um mundo dentro de cada ideia.</h2>
            <p>
              {featured.lastReadAt
                ? `Você parou em ${featured.progress}% de ${featured.title}.`
                : `Comece por ${featured.title} e dê espaço às suas próximas conexões.`}
            </p>
            <button className="text-button" onClick={() => open(featured)}>
              {featured.lastReadAt
                ? "Continuar de onde parei"
                : "Abrir este material"}
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="showcase-volume"
            aria-label={`Abrir destaque: ${featured.title}`}
            onClick={() => open(featured)}
          >
            <SourceObject source={featured} />
          </button>
          <div className="showcase-recent">
            <Overline>À MÃO, PARA EXPLORAR</Overline>
            {recent.slice(1, 4).map((s) => (
              <button key={s.id} onClick={() => open(s)}>
                <i style={{ background: s.spineColor }} />
                <span>
                  <strong>{s.title}</strong>
                  <small>
                    {s.format} ·{" "}
                    {s.progress ? `${s.progress}% lido` : s.readTime}
                  </small>
                </span>
              </button>
            ))}
            {recent.length === 1 && (
              <p className="form-intro">
                Sua próxima descoberta começa com uma nova fonte.
              </p>
            )}
          </div>
        </section>
      )}
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
            className={view === "covers" ? "active" : ""}
            onClick={() => setView("covers")}
          >
            Capas
          </button>
          <button
            className={view === "folders" ? "active" : ""}
            onClick={() => setView("folders")}
          >
            <Folder size={14} />
            Pastas
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
            <option value="color">Cor</option>
            <option value="reading">Última leitura</option>
          </select>
        </label>
      </div>
      {sources.some((s) => s.folder) && (
        <div className="folder-filters" aria-label="Pastas">
          <button
            className={!folder ? "active" : ""}
            onClick={() => setFolder("")}
          >
            Todas as pastas
          </button>
          {[...new Set(sources.map((s) => s.folder).filter(Boolean))].map(
            (f) => (
              <button
                className={folder === f ? "active" : ""}
                key={f}
                onClick={() => setFolder(f!)}
              >
                <span className="folder-shape" />
                {f}
                <small>{sources.filter((s) => s.folder === f).length}</small>
              </button>
            ),
          )}
        </div>
      )}
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
      {view === "folders" && (
        <nav className="folder-breadcrumb" aria-label="Caminho da pasta">
          <button onClick={() => setFolder("")}>Biblioteca</button>
          {folder
            .split(" / ")
            .filter(Boolean)
            .map((part, i) => (
              <span key={i}>
                {" "}
                /{" "}
                <button
                  onClick={() =>
                    setFolder(
                      folder
                        .split(" / ")
                        .slice(0, i + 1)
                        .join(" / "),
                    )
                  }
                >
                  {part}
                </button>
              </span>
            ))}
        </nav>
      )}
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
              {filtered.map((s) => (
                <div className="book-item" key={s.id}>
                  <button
                    className="shelf-object-open"
                    aria-label={`Ler ${s.title}`}
                    onClick={() => open(s)}
                  >
                    <SourceObject source={s} spine />
                  </button>
                  <button className="book-name" onClick={() => open(s)}>
                    {s.title}
                  </button>
                  <small className="spine-meta">
                    {s.format} · {s.progress}% lido
                  </small>
                  <button
                    className="shelf-detail"
                    onClick={() => setDetails(s)}
                  >
                    Detalhes
                  </button>
                </div>
              ))}
            </div>
            <div className="shelf-ledge" />
          </section>
          <div className="shelf-caption">
            <span>
              Livros, documentos e ideias. Cada material, um novo universo.
            </span>
            <span>{filtered.length} fontes nesta estante</span>
          </div>
        </>
      ) : view === "topics" ? (
        <div className="folder-grid">
          {[...new Set(filtered.map((s) => s.topic))].map((t) => {
            const collection = filtered.filter((s) => s.topic === t);
            return (
              <button
                key={t}
                className="folder-card"
                onClick={() => {
                  setShelfFilter(t);
                  setView("covers");
                }}
              >
                <FolderObject
                  title={t}
                  count={collection.length}
                  sources={collection}
                />
                <strong>{t}</strong>
                <small>Coleção por tema · {collection.length} fontes</small>
              </button>
            );
          })}
        </div>
      ) : view === "list" ? (
        <div className="source-table">
          {filtered.map((s) => (
            <div key={s.id} className="source-row">
              <button className="source-row-main" onClick={() => open(s)}>
                <span className="source-mini-object">
                  <SourceObject source={s} />
                </span>
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
      ) : (
        <>
          {view === "folders" && (
            <>
              <div className="folder-grid">
                {childFolders.map((path) => {
                  const collection = filtered.filter(
                    (s) =>
                      folderPath(s) === path ||
                      folderPath(s).startsWith(path + " / "),
                  );
                  return (
                    <button
                      className="folder-card"
                      key={path}
                      onClick={() => setFolder(path)}
                    >
                      <FolderObject
                        title={path.split(" / ").at(-1)!}
                        count={collection.length}
                        sources={collection}
                      />
                      <strong>{path.split(" / ").at(-1)}</strong>
                      <small>{collection.length} materiais · Abrir pasta</small>
                    </button>
                  );
                })}
              </div>
              {!folder && (
                <p className="folder-unfiled">
                  Materiais sem pasta · Organize nas opções de cada fonte.
                </p>
              )}
            </>
          )}
          <SourceCoverGrid
            sources={view === "folders" ? folderSources : filtered}
            open={open}
            details={setDetails}
          />
        </>
      )}
      <div className="library-bottom">
        <div className="library-bottom-copy">
          <Overline>LEITURA, PENSAMENTO, MEMÓRIA.</Overline>
          <p>
            {notes.length} notas e {marginNotes.length} marcações guardadas.
            <br />O que você leu pode continuar conversando com você.
          </p>
          <button
            className="text-button"
            onClick={() =>
              void exportNotebooks(snapshot()).catch(() =>
                toast.error("Não foi possível exportar os cadernos."),
              )
            }
          >
            <Download size={14} />
            Exportar todos os cadernos
          </button>
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
      {reorganizing && (
        <ReorganizeSourceModal
          source={reorganizing}
          close={() => setReorganizing(null)}
        />
      )}
      {adding && <AddSourceModal onClose={() => setAdding(false)} />}{" "}
      {bookmarks && <BookmarkImport close={() => setBookmarks(false)} />}
      {edition && <GlossEditionModal onClose={() => setEdition(false)} />}
      {details && (
        <Modal title="Sobre esta fonte" close={() => setDetails(null)}>
          <div className="form-stack">
            <Overline>
              {details.format} ·{" "}
              {details.origin === "example" ? "EXEMPLO" : details.topic}
            </Overline>
            <h3>{details.title}</h3>
            <label className="field">
              Título
              <input
                value={details.title}
                onChange={(e) =>
                  setDetails({ ...details, title: e.target.value })
                }
              />
            </label>
            <div className="field-row">
              <label className="field">
                Tema
                <input
                  value={details.topic}
                  onChange={(e) =>
                    setDetails({ ...details, topic: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Pasta
                <input
                  value={details.folder ?? ""}
                  onChange={(e) =>
                    setDetails({ ...details, folder: e.target.value })
                  }
                  placeholder="Ex.: Psicologia / História"
                />
              </label>
            </div>
            <label className="field">
              Tags, separadas por vírgula
              <input
                value={(details.tags ?? []).join(", ")}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    tags: e.target.value.split(",").map((t) => t.trim()),
                  })
                }
              />
            </label>
            <label className="field">
              Cor da capa
              <input
                type="color"
                value={details.spineColor}
                onChange={(e) =>
                  setDetails({ ...details, spineColor: e.target.value })
                }
              />
            </label>
            {details.fileId && /^(PDF|EPUB|DOCX)$/i.test(details.format) && (
              <button
                className="button"
                onClick={() => {
                  setReorganizing(details);
                  setDetails(null);
                }}
              >
                <ScanText size={15} />
                Organizar texto do material
              </button>
            )}
            <div className="button-row">
              <button
                className="button"
                disabled={!details.title.trim()}
                onClick={() => {
                  updateSource(details.id, {
                    title: details.title.trim(),
                    topic: details.topic.trim() || "Sem categoria",
                    folder: details.folder?.trim(),
                    tags: details.tags?.filter(Boolean),
                    spineColor: details.spineColor,
                  });
                  toast.success("Organização salva.");
                  setDetails(null);
                }}
              >
                Salvar organização
              </button>
              <button
                className="button subtle"
                disabled={suggesting || !details.paragraphs.length}
                onClick={async () => {
                  setSuggesting(true);
                  try {
                    const result = await assist(
                      "classify",
                      "Sugira um tema e tags para organizar este material.",
                      readingContext(details, [], 20000).text,
                      details.title,
                    );
                    if (result.classification)
                      setDetails((previous) =>
                        previous?.id === details.id
                          ? { ...previous, ...result.classification }
                          : previous,
                      );
                  } catch (e) {
                    toast.error(
                      e instanceof Error
                        ? e.message
                        : "A sugestão não ficou disponível.",
                    );
                  } finally {
                    setSuggesting(false);
                  }
                }}
              >
                {suggesting ? "Pensando…" : "Sugerir organização"}
              </button>
            </div>
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

function SourceCoverGrid({
  sources,
  open,
  details,
}: {
  sources: Source[];
  open: (source: Source) => void;
  details: (source: Source) => void;
}) {
  return (
    <div className="cover-grid">
      {sources.map((s) => (
        <article key={s.id} className="cover-item">
          <button
            className="object-open"
            aria-label={`Ler ${s.title}`}
            onClick={() => open(s)}
          >
            <SourceObject source={s} />
          </button>
          <div className="object-caption">
            <div className="object-caption-top">
              <small>
                {s.format} · {s.topic}
              </small>
              <button
                className="icon-button"
                aria-label={`Detalhes de ${s.title}`}
                onClick={() => details(s)}
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
            <button className="object-title" onClick={() => open(s)}>
              {s.title}
            </button>
            <small>{s.author}</small>
            <small>{s.progress ? `${s.progress}% lido` : s.readTime}</small>
            <span className="object-reading">
              <i style={{ width: `${s.progress}%` }} />
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
