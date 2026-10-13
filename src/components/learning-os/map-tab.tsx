import { useState } from "react";
import {
  Plus,
  ArrowRight,
  ArrowUpRight,
  Trash2,
  Waypoints,
  Check,
  List,
  Network,
} from "lucide-react";
import { useVault } from "@/lib/vault/store";
import { Modal, Overline, Empty } from "./ui";
export function MapTab() {
  const {
    notes,
    relations,
    sources,
    addRelation,
    deleteRelation,
    selectNote,
    setTab,
  } = useVault((s) => s);
  const [selected, setSelected] = useState(notes[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState(notes[0]?.id ?? "");
  const [to, setTo] = useState(notes[1]?.id ?? "");
  const [kind, setKind] = useState<"relaciona" | "contradiz" | "pre-requisito">(
    "relaciona",
  );
  const [reason, setReason] = useState("");
  const [view, setView] = useState<"map" | "list">("map");
  const active = notes.find((n) => n.id === selected);
  const positions = new Map(
    notes.map((n, i) => [
      n.id,
      { x: 40 + (i % 3) * 305, y: 35 + Math.floor(i / 3) * 145 },
    ]),
  );
  const graphHeight = Math.max(350, Math.ceil(notes.length / 3) * 145 + 35);
  return (
    <div className="map-page">
      <div className="page-heading">
        <div>
          <Overline>IDEIAS EM CONVERSA</Overline>
          <h1>
            Conexões<span className="title-period">.</span>
          </h1>
          <p>Nomeie o que aproxima, contradiz ou prepara uma ideia.</p>
        </div>
        <button
          className="button primary"
          disabled={notes.length < 2}
          onClick={() => setAdding(true)}
        >
          <Plus size={15} />
          Nova conexão
        </button>
      </div>
      <div className="connection-toolbar">
        <span>
          {notes.length} notas · {relations.length} relações
        </span>
        <div className="segmented">
          <button
            className={view === "map" ? "active" : ""}
            onClick={() => setView("map")}
          >
            <Network size={14} />
            Mapa
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <List size={14} />
            Lista
          </button>
        </div>
      </div>
      {!notes.length ? (
        <Empty
          title="Toda conexão começa com uma ideia."
          text="Guarde duas notas para relacioná-las aqui."
        />
      ) : (
        <>
          {view === "map" && (
            <div className="knowledge-map">
              <svg
                viewBox={`0 0 950 ${graphHeight}`}
                role="img"
                aria-label="Mapa das notas e relações"
              >
                <defs>
                  <marker
                    id="relation-arrow"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                  </marker>
                </defs>
                {relations.map((r) => {
                  const a = positions.get(r.from),
                    b = positions.get(r.to);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={r.id}
                      x1={a.x + 125}
                      y1={a.y + 48}
                      x2={b.x + 125}
                      y2={b.y + 48}
                      className={`relation-line ${r.kind}`}
                      markerEnd="url(#relation-arrow)"
                    />
                  );
                })}
                {notes.map((n) => {
                  const p = positions.get(n.id)!;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${p.x},${p.y})`}
                      className={`graph-node ${selected === n.id ? "selected" : ""}`}
                      role="button"
                      tabIndex={0}
                      aria-label={n.title}
                      onClick={() => setSelected(n.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(n.id);
                        }
                      }}
                    >
                      <rect width="260" height="96" rx="5" />
                      <text x="16" y="24" className="graph-author">
                        {(
                          sources.find((s) => s.id === n.fonte)?.author ??
                          "Fonte"
                        ).slice(0, 30)}
                      </text>
                      <text x="16" y="50">
                        {n.title.slice(0, 32)}
                        {n.title.length > 32 ? "…" : ""}
                      </text>
                      <text x="16" y="77" className="graph-location">
                        {n.paginas}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
          <div
            className={`connection-note-list ${view === "list" ? "shown" : ""}`}
          >
            {notes.map((n) => (
              <button
                key={n.id}
                className={selected === n.id ? "active" : ""}
                onClick={() => setSelected(n.id)}
              >
                <strong>{n.title}</strong>
                <small>
                  {sources.find((s) => s.id === n.fonte)?.author} · {n.paginas}
                </small>
              </button>
            ))}
          </div>
          {active && (
            <div className="map-inspector">
              <div>
                <Overline>IDEIA SELECIONADA</Overline>
                <h2>{active.title}</h2>
                <p>{active.claims[0] || active.content}</p>
                <button
                  className="text-button"
                  onClick={() => {
                    selectNote(active.id);
                    setTab("notas");
                  }}
                >
                  Abrir nota e referência
                  <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="inspector-relations">
                <Overline>CONEXÕES DESTA NOTA</Overline>
                {relations
                  .filter((r) => r.from === active.id || r.to === active.id)
                  .map((r) => (
                    <div key={r.id}>
                      <span>
                        {r.kind === "contradiz"
                          ? "Contradiz"
                          : r.kind === "pre-requisito"
                            ? "É pré-requisito de"
                            : "Relaciona-se com"}
                      </span>
                      <button
                        onClick={() =>
                          setSelected(r.from === active.id ? r.to : r.from)
                        }
                      >
                        {
                          notes.find(
                            (n) =>
                              n.id === (r.from === active.id ? r.to : r.from),
                          )?.title
                        }
                        <ArrowRight size={13} />
                      </button>
                      <small>{r.reason.slice(0, 170)}</small>
                      <button
                        className="icon-button relation-delete"
                        aria-label="Remover conexão"
                        onClick={() => {
                          if (confirm("Remover esta conexão?"))
                            deleteRelation(r.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                {!relations.some(
                  (r) => r.from === active.id || r.to === active.id,
                ) && (
                  <p className="muted">
                    Esta ideia ainda pode encontrar outras.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {adding && (
        <Modal title="Nomear uma conexão" close={() => setAdding(false)}>
          <div className="form-stack">
            <label className="field">
              Esta nota
              <select value={from} onChange={(e) => setFrom(e.target.value)}>
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Relação
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                <option value="relaciona">Relaciona-se com</option>
                <option value="contradiz">Contradiz</option>
                <option value="pre-requisito">É pré-requisito de</option>
              </select>
            </label>
            <label className="field">
              Esta outra nota
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Por que elas se conectam?
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Escreva uma relação explícita entre as ideias."
              />
            </label>
            <button
              className="button primary"
              disabled={!from || !to || from === to || !reason.trim()}
              onClick={() => {
                addRelation({
                  from,
                  to,
                  kind,
                  reason: reason.trim(),
                  citation: [
                    notes.find((n) => n.id === from)?.citation,
                    notes.find((n) => n.id === to)?.citation,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                });
                setAdding(false);
                setReason("");
              }}
            >
              <Check size={15} />
              Guardar conexão
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
