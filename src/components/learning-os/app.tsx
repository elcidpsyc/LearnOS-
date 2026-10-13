import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  BookOpen,
  Library,
  RotateCcw,
  NotebookPen,
  Waypoints,
  Settings2,
  CloudCheck,
  HardDrive,
  ArrowLeft,
  Menu,
  Search,
  X,
} from "lucide-react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { hydrateVault, useVault, type TabId } from "@/lib/vault/store";
import { isDue } from "@/lib/vault/model";
const StudyTab = lazy(() =>
  import("./study-tab").then((m) => ({ default: m.StudyTab })),
);
const SourcesTab = lazy(() =>
  import("./sources-tab").then((m) => ({ default: m.SourcesTab })),
);
const NotesTab = lazy(() =>
  import("./notes-tab").then((m) => ({ default: m.NotesTab })),
);
const ReviewTab = lazy(() =>
  import("./review-tab").then((m) => ({ default: m.ReviewTab })),
);
const MapTab = lazy(() =>
  import("./map-tab").then((m) => ({ default: m.MapTab })),
);
import { WorkspaceSettings } from "./settings";
import { Modal } from "./ui";
const tabs = [
  { id: "fontes", label: "Biblioteca", icon: Library },
  { id: "estudar", label: "Ler", icon: BookOpen },
  { id: "notas", label: "Notas", icon: NotebookPen },
  { id: "revisar", label: "Revisar", icon: RotateCcw },
  { id: "mapa", label: "Conexões", icon: Waypoints },
] as const;
export function LearningOS() {
  const {
    tab,
    setTab,
    settings,
    hydrated,
    cards,
    cloudStatus,
    setSettingsOpen,
    settingsOpen,
    storageError,
    sources,
    notes,
    setActiveSourceId,
    selectNote,
  } = useVault((s) => s);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => hydrateVault(), []);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty("--pen", settings.penColor);
    document.documentElement.style.setProperty(
      "--highlight",
      settings.highlightColor,
    );
  }, [settings.theme, settings.penColor, settings.highlightColor]);
  useEffect(() => {
    const open = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    document.addEventListener("keydown", open);
    return () => document.removeEventListener("keydown", open);
  }, []);
  const due = cards.filter((c) => isDue(c)).length;
  if (!hydrated)
    return (
      <div className="boot-screen">
        <BookOpen size={30} />
        <p>Abrindo seu caderno…</p>
      </div>
    );
  const focused = settings.focus && tab === "estudar";
  return (
    <MotionConfig reducedMotion="user">
      <div className={`app ${focused ? "focus-mode" : ""}`}>
        <header className="app-header">
          <button
            className="brand"
            onClick={() => setTab("fontes")}
            aria-label="LearnOS — abrir biblioteca"
          >
            <span className="brand-symbol">
              <span />
              <span />
              <span />
            </span>
            <span>
              Learn<span className="brand-os">OS</span>
            </span>
          </button>
          <nav className="desktop-nav" aria-label="Navegação principal">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                <Icon size={14} />
                {label}
                {id === "revisar" && due > 0 && (
                  <span className="count-dot">{due}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <span className="save-status">
              {cloudStatus === "synced" ? (
                <CloudCheck size={13} />
              ) : (
                <HardDrive size={13} />
              )}
              <span>
                {cloudStatus === "synced" ? "Sincronizado" : "Neste aparelho"}
              </span>
            </span>
            <button
              className="icon-button"
              aria-label="Buscar no caderno"
              title="Buscar · Ctrl K"
              onClick={() => setSearch(true)}
            >
              <Search size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Meu espaço"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={17} />
            </button>
          </div>
        </header>
        {storageError && (
          <div className="storage-banner" role="alert">
            {storageError}
            <button onClick={() => setSettingsOpen(true)}>Abrir backup</button>
          </div>
        )}
        <main className={`workspace workspace-${tab}`}>
          <Suspense
            fallback={
              <div className="empty-state">Abrindo esta parte do caderno…</div>
            }
          >
            {tab === "fontes" && <SourcesTab />}
            {tab === "estudar" && <StudyTab />}
            {tab === "notas" && <NotesTab />}
            {tab === "revisar" && <ReviewTab />}
            {tab === "mapa" && <MapTab />}
          </Suspense>
        </main>
        <nav className="mobile-nav" aria-label="Navegação móvel">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
              aria-label={label}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === "revisar" && due > 0 && <i />}
            </button>
          ))}
        </nav>
        {settingsOpen && <WorkspaceSettings />}
        {search && (
          <Modal title="Buscar no caderno" close={() => setSearch(false)}>
            <label className="field">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Título, autor ou ideia…"
                aria-label="Busca global"
              />
            </label>
            <div className="global-results">
              {query.trim() && (
                <>
                  {sources
                    .filter((s) =>
                      `${s.title} ${s.author}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setActiveSourceId(s.id);
                          setTab("estudar");
                          setSearch(false);
                        }}
                      >
                        <BookOpen size={16} />
                        <span>
                          {s.title}
                          <small>{s.author} · Fonte</small>
                        </span>
                      </button>
                    ))}
                  {notes
                    .filter((n) =>
                      `${n.title} ${n.content}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          selectNote(n.id);
                          setTab("notas");
                          setSearch(false);
                        }}
                      >
                        <NotebookPen size={16} />
                        <span>
                          {n.title}
                          <small>Nota</small>
                        </span>
                      </button>
                    ))}
                </>
              )}
            </div>
          </Modal>
        )}
        <Toaster
          position="bottom-right"
          theme={settings.theme === "night" ? "dark" : "light"}
        />
      </div>
    </MotionConfig>
  );
}
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("learnos_ui_error", { name: error.name });
  }
  render() {
    return this.state.failed ? (
      <div className="boot-screen">
        <BookOpen size={28} />
        <h2>Seu caderno foi preservado.</h2>
        <p>Esta tela não pôde ser aberta. Recarregue para tentar novamente.</p>
        <button className="button" onClick={() => location.reload()}>
          Reabrir LearnOS
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
