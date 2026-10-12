import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Waypoints, Sparkles, ArrowRight, BookOpen, Layers, Network } from "lucide-react";
import { useVault, FONTE_LABEL } from "@/lib/vault/store";

interface Node {
  id: string;
  label: string;
  category: "AI" | "Carreira" | "Engenharia" | "Cognição";
  sourceId: string;
  summary: string;
  x: number;
  y: number;
  connections: string[];
}

const NODES: Node[] = [
  {
    id: "fde",
    label: "Forward Deployed Eng.",
    category: "Engenharia",
    sourceId: "fde_guide",
    summary: "Engenheiros na linha de frente que transformam problemas específicos em componentes de plataforma reutilizáveis.",
    x: 48,
    y: 28,
    connections: ["frontline", "kepler", "palantir"]
  },
  {
    id: "palantir",
    label: "Cultura Palantir",
    category: "Engenharia",
    sourceId: "fde_guide",
    summary: "Berço da metodologia FDE e rotação entre campo operacional e desenvolvimento de plataforma de dados.",
    x: 20,
    y: 40,
    connections: ["fde", "frontline"]
  },
  {
    id: "frontline",
    label: "Project Frontline",
    category: "Engenharia",
    sourceId: "fde_guide",
    summary: "Programa de rotação de 250+ engenheiros entre engenharia de produto e implantação no cliente.",
    x: 28,
    y: 65,
    connections: ["fde", "palantir"]
  },
  {
    id: "kepler",
    label: "IA Determinística",
    category: "AI",
    sourceId: "fde_guide",
    summary: "Infraestrutura de IA onde respostas plausíveis porém erradas são inaceitáveis (finanças, defesa).",
    x: 72,
    y: 35,
    connections: ["fde", "software2"]
  },
  {
    id: "compound",
    label: "Juros Compostos da Mente",
    category: "Cognição",
    sourceId: "hamming",
    summary: "Tese de Hamming: 10% a mais de esforço constante dobra a produtividade intelectual ao longo dos anos.",
    x: 45,
    y: 80,
    connections: ["greatwork", "bitter"]
  },
  {
    id: "greatwork",
    label: "Trabalho Excepcional",
    category: "Carreira",
    sourceId: "graham",
    summary: "Perseguição de curiosidade obsessiva em terrenos férteis com alta capacidade de impacto.",
    x: 75,
    y: 82,
    connections: ["compound"]
  },
  {
    id: "bitter",
    label: "The Bitter Lesson",
    category: "AI",
    sourceId: "bitter_lesson",
    summary: "Poder computacional e busca massiva superam conhecimento humano codificado à mão.",
    x: 78,
    y: 58,
    connections: ["software2", "compound"]
  },
  {
    id: "software2",
    label: "Software 2.0",
    category: "AI",
    sourceId: "software_2",
    summary: "O código é escrito no espaço de pesos neurais via otimização, e não como lógica if/else procedimental.",
    x: 82,
    y: 18,
    connections: ["bitter", "kepler"]
  }
];

export function MapTab() {
  const setActiveSourceId = useVault((s) => s.setActiveSourceId);
  const setTab = useVault((s) => s.setTab);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("fde");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const activeNode = NODES.find((n) => n.id === selectedNodeId) || NODES[0];

  const filteredNodes = NODES.filter(
    (n) => filterCategory === "all" || n.category === filterCategory
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
            Grafo de Conhecimento
          </h2>
          <p className="text-xs text-[#a1a1aa]">
            Mapeamento ontológico de conceitos e conexões entre leituras
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          {["all", "AI", "Engenharia", "Cognição", "Carreira"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                filterCategory === cat
                  ? "bg-white text-black font-semibold"
                  : "bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white"
              }`}
            >
              {cat === "all" ? "Todos" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Graph Canvas Area */}
      <div className="relative min-h-[380px] w-full overflow-hidden rounded-3xl border border-[#27272a] bg-[#0c0c0e] p-6 shadow-border">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        />

        {/* Render Connection Lines (SVG) */}
        <svg className="pointer-events-none absolute inset-0 size-full">
          {NODES.flatMap((node) =>
            node.connections.map((targetId) => {
              const target = NODES.find((n) => n.id === targetId);
              if (!target) return null;
              const isHighlighted =
                selectedNodeId === node.id || selectedNodeId === target.id;

              return (
                <line
                  key={`${node.id}-${target.id}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${target.x}%`}
                  y2={`${target.y}%`}
                  stroke={isHighlighted ? "rgba(255, 255, 255, 0.6)" : "rgba(255, 255, 255, 0.12)"}
                  strokeWidth={isHighlighted ? "2" : "1"}
                  strokeDasharray={isHighlighted ? "none" : "3 3"}
                />
              );
            })
          )}
        </svg>

        {/* Node Points */}
        {filteredNodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isNeighbor = activeNode.connections.includes(node.id);

          return (
            <motion.button
              key={node.id}
              type="button"
              onClick={() => setSelectedNodeId(node.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 focus:outline-none transition-all ${
                isSelected ? "z-20 scale-105" : "z-10"
              }`}
            >
              <div
                className={`flex size-10 items-center justify-center rounded-2xl border text-xs font-bold transition-all shadow-lg ${
                  isSelected
                    ? "border-white bg-white text-black ring-4 ring-white/20"
                    : isNeighbor
                    ? "border-amber-400 bg-amber-500/20 text-amber-200"
                    : "border-[#27272a] bg-[#18181b] text-white hover:border-white/40"
                }`}
              >
                <Waypoints className="size-4" />
              </div>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap backdrop-blur-sm transition-colors ${
                  isSelected
                    ? "bg-white text-black font-semibold"
                    : "bg-[#09090b]/80 text-[#d4d4d8] border border-white/5"
                }`}
              >
                {node.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Node Drawer Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeNode.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-3xl border border-[#27272a] bg-[#18181b] p-5 shadow-border"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-mono uppercase text-white font-semibold">
                {activeNode.category}
              </span>
              <span className="text-xs text-[#a1a1aa]">
                Fonte: {FONTE_LABEL[activeNode.sourceId] || activeNode.sourceId}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSourceId(activeNode.sourceId);
                setTab("estudar");
              }}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-neutral-200 transition"
            >
              <BookOpen className="size-3.5" />
              Estudar Texto
            </button>
          </div>

          <h3 className="font-display text-xl font-semibold text-white mb-1.5">
            {activeNode.label}
          </h3>

          <p className="text-xs text-[#d4d4d8] leading-relaxed mb-4">
            {activeNode.summary}
          </p>

          <div className="flex items-center gap-2 text-[11px] text-[#a1a1aa]">
            <span className="font-semibold text-white">Nós conectados:</span>
            <div className="flex flex-wrap gap-1.5">
              {activeNode.connections.map((cId) => {
                const target = NODES.find((n) => n.id === cId);
                if (!target) return null;
                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => setSelectedNodeId(cId)}
                    className="rounded-lg bg-[#27272a] px-2 py-0.5 text-[10px] text-[#fafafa] hover:bg-white hover:text-black transition"
                  >
                    {target.label} →
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
