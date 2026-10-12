import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Library,
  BookMarked,
  Search,
  Sparkles,
  Bot,
  Printer,
  Plus,
  LayoutGrid,
  Columns,
  Clock,
  BookOpen,
  ArrowRight,
  TrendingUp,
  CheckCircle2
} from "lucide-react";
import confetti from "canvas-confetti";
import { useVault, type Source } from "@/lib/vault/store";
import { AddSourceModal } from "./add-source-modal";
import { GlossEditionModal } from "./gloss-edition-modal";

interface SourcesTabProps {
  aiOn?: boolean;
}

export function SourcesTab({ aiOn = true }: SourcesTabProps) {
  const sources = useVault((s) => s.sources);
  const setActiveSourceId = useVault((s) => s.setActiveSourceId);
  const setTab = useVault((s) => s.setTab);
  const shelfFilter = useVault((s) => s.shelfFilter);
  const setShelfFilter = useVault((s) => s.setShelfFilter);
  const shelfSort = useVault((s) => s.shelfSort);
  const setShelfSort = useVault((s) => s.setShelfSort);
  const addSource = useVault((s) => s.addSource);

  const [viewMode, setViewMode] = useState<"shelf" | "topics">("shelf");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [agentToast, setAgentToast] = useState<{
    visible: boolean;
    bot: string;
    text: string;
  }>({
    visible: true,
    bot: "Grok Bot",
    text: "Towards Autonomous Product Development (Unsorted)"
  });

  const categories = [
    { id: "all", label: "All", count: 96 },
    { id: "AI", label: "AI", count: 37 },
    { id: "Programming", label: "Programming", count: 11 },
    { id: "Infrastructure", label: "Infrastructure", count: 14 },
    { id: "Data", label: "Data", count: 1 },
    { id: "Security", label: "Security", count: 1 },
    { id: "Work & careers", label: "Work & careers", count: 6 },
    { id: "Writing", label: "Writing", count: 1 },
    { id: "agent", label: "From your agent", count: 21 },
  ];

  const filteredSources = sources.filter((s) => {
    const matchesFilter =
      shelfFilter === "all" ||
      shelfFilter === "agent" ||
      s.topic.toLowerCase() === shelfFilter.toLowerCase();

    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.topic.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleSelectBook = (source: Source) => {
    setActiveSourceId(source.id);
    setTab("estudar");
  };

  const handleBotImport = (botName: string) => {
    // Add sample imported book from bot
    addSource({
      title: "Towards Autonomous Product Development",
      author: "Hassan El Mghari & Team",
      topic: "AI",
      readTime: "14 min read",
      pages: 22,
      spineColor: "linear-gradient(180deg, #4338ca 0%, #312e81 100%)",
      spineTextColor: "#e0e7ff",
      spineHeight: 188,
      spineWidth: 32,
      publishedYear: "2026",
      progress: 0,
      briefSummary: "Artigo sincronizado automaticamente pelo seu agente MCP a partir dos seus bookmarks do X.",
      claims: [
        "A autonomia de produtos de software cresce exponencialmente com loops de feedback rápidos.",
        "Modelos de IA modernos transformam especificações de alto nível em execuções verificáveis."
      ],
      paragraphs: [
        {
          id: 1,
          firstLetterDrop: true,
          text: "Towards Autonomous Product Development: As AI agent systems become capable of reading and acting on complex web environments, the bottleneck of software engineering shifts from typing syntax to architectural synthesis."
        }
      ]
    });

    setAgentToast({
      visible: true,
      bot: botName,
      text: "Towards Autonomous Product Development sincronizado!"
    });

    confetti({ particleCount: 70, spread: 60 });
  };

  return (
    <div className="space-y-6">
      {/* Gloss Style Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1a1aa] flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Gloss · Hassan's Library
              </span>
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Biblioteca de Estudos
            </h2>
            <p className="text-xs text-[#a1a1aa] mt-1">
              96 textos · 10 tópicos · 27 horas de leitura ativa
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-white/40 hover:bg-[#27272a] transition shadow-sm"
            >
              <Printer className="size-3.5 text-amber-400" />
              Edição Impressa
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200 transition shadow-sm"
            >
              <Plus className="size-3.5" />
              Adicionar Artigos
            </button>
          </div>
        </div>

        {/* New Agent Notification Pill (from Video 1) */}
        <div className="flex items-center justify-between rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-purple-400" />
            <span className="font-medium">
              21 novos artigos adicionados pelo seu agente desde a última visita
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShelfFilter("agent")}
            className="text-[11px] font-semibold text-purple-300 hover:text-white transition underline"
          >
            Ver na estante
          </button>
        </div>

        {/* View Switcher, Search Bar and Arrange By */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Shelf vs Topics Buttons */}
          <div className="flex items-center rounded-2xl bg-[#18181b] p-1 border border-[#27272a]">
            <button
              type="button"
              onClick={() => setViewMode("shelf")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "shelf"
                  ? "bg-white text-black shadow-sm"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              <Columns className="size-3.5" />
              Estante (Shelf)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("topics")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "topics"
                  ? "bg-white text-black shadow-sm"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              Tópicos
            </button>
          </div>

          {/* Search Library */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-[#71717a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar na biblioteca..."
              className="w-full rounded-2xl border border-[#27272a] bg-[#18181b] py-1.5 pl-9 pr-3 text-xs text-white placeholder-[#71717a] outline-none focus:border-white/30"
            />
          </div>

          {/* Arrange by pills */}
          <div className="flex items-center gap-1 text-[11px] text-[#71717a]">
            <span className="font-mono uppercase text-[9px]">Ordenar:</span>
            {(["topic", "recent", "length"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShelfSort(s)}
                className={`rounded-lg px-2 py-0.5 capitalize transition ${
                  shelfSort === s
                    ? "bg-[#27272a] text-white font-semibold"
                    : "hover:text-white"
                }`}
              >
                {s === "topic" ? "Tópico" : s === "recent" ? "Recente" : "Tamanho"}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills Slider (from Video 1) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setShelfFilter(c.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap ${
                shelfFilter === c.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white"
              }`}
            >
              <span>{c.label}</span>
              <span className={`text-[10px] font-mono ${shelfFilter === c.id ? "text-neutral-600" : "text-[#71717a]"}`}>
                {c.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === "shelf" ? (
        /* The Realistic Gloss 3D Bookshelf */
        <div className="space-y-4">
          <div className="relative min-h-[340px] w-full rounded-3xl border border-[#27272a] bg-gradient-to-b from-[#141416] via-[#111113] to-[#0c0c0e] p-6 shadow-border flex flex-col justify-end overflow-hidden">
            {/* Shelf backdrop glow */}
            <div className="pointer-events-none absolute inset-0 bg-radial from-white/[0.04] to-transparent" />

            {/* Books upright on the shelf */}
            <div className="relative z-10 flex items-end justify-center gap-2.5 overflow-x-auto px-4 pb-2 pt-10 scrollbar-none">
              {filteredSources.map((source, index) => {
                const height = source.spineHeight || 180;
                const width = source.spineWidth || 32;

                return (
                  <motion.div
                    key={source.id}
                    whileHover={{ y: -16, scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    onClick={() => handleSelectBook(source)}
                    className="group relative cursor-pointer select-none flex-shrink-0"
                    style={{ height: `${height}px`, width: `${width}px` }}
                    title={`${source.title} — ${source.author}`}
                  >
                    {/* Realistic 3D Book Spine */}
                    <div
                      className="relative size-full rounded-t-md rounded-b-[2px] shadow-[2px_6px_14px_rgba(0,0,0,0.8)] border-t border-l border-white/20 flex flex-col justify-between p-1.5 transition-all group-hover:shadow-[0_12px_24px_rgba(255,255,255,0.12)]"
                      style={{
                        background: source.spineColor,
                        color: source.spineTextColor || "#ffffff"
                      }}
                    >
                      {/* Spine embossing grooves */}
                      <div className="absolute top-2 inset-x-0 h-px bg-white/20" />
                      <div className="absolute top-3 inset-x-0 h-px bg-white/10" />
                      <div className="absolute bottom-5 inset-x-0 h-px bg-white/20" />

                      {/* Header bookmark tag on spine */}
                      <div className="text-[8px] font-mono uppercase tracking-widest opacity-75 text-center truncate">
                        {source.topic.slice(0, 3)}
                      </div>

                      {/* Vertical Spine Title */}
                      <div className="my-auto flex items-center justify-center overflow-hidden py-1">
                        <span
                          className="font-serif text-[11px] font-semibold tracking-tight whitespace-nowrap opacity-90 transition-opacity group-hover:opacity-100"
                          style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)"
                          }}
                        >
                          {source.title.length > 24 ? source.title.slice(0, 24) + "..." : source.title}
                        </span>
                      </div>

                      {/* Bottom Author/Year marker */}
                      <div className="text-[8px] font-mono text-center opacity-70">
                        {source.publishedYear}
                      </div>
                    </div>

                    {/* Book hover preview bubble */}
                    <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-30 whitespace-nowrap rounded-xl bg-black/90 border border-white/20 px-2.5 py-1 text-[11px] text-white shadow-xl backdrop-blur-sm">
                      <p className="font-semibold">{source.title.slice(0, 32)}</p>
                      <p className="text-[9px] text-[#a1a1aa]">{source.author} · {source.readTime}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Wooden / Charcoal Shelf Ledge with realistic depth */}
            <div className="relative z-10 w-full">
              {/* Shelf Top surface */}
              <div className="h-3 w-full bg-gradient-to-r from-[#2c221b] via-[#3d3128] to-[#2c221b] border-t border-[#6b5849]/50 shadow-inner rounded-t-sm" />
              {/* Shelf Front face */}
              <div className="h-4 w-full bg-gradient-to-b from-[#1f1813] to-[#120e0b] shadow-[0_10px_20px_rgba(0,0,0,0.9)] border-b border-black" />
            </div>
          </div>

          <p className="text-center text-[11px] text-[#71717a]">
            Clique em qualquer lombada para abrir no leitor com glosses e anotações ativas.
          </p>
        </div>
      ) : (
        /* The Topics Grid View with Retro Cards and Reading Time Bars */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: "AI & Machine Learning",
              pieces: "37 textos",
              time: "13 h 8 min",
              progress: [40, 60, 90, 30, 80, 50, 70, 95, 45, 85],
              color: "border-purple-500/30 bg-purple-500/5",
              accent: "bg-purple-500"
            },
            {
              name: "Programming & Systems",
              pieces: "11 textos",
              time: "2 h 45 min",
              progress: [70, 85, 30, 90, 60, 40],
              color: "border-blue-500/30 bg-blue-500/5",
              accent: "bg-blue-500"
            },
            {
              name: "Infrastructure & Cloud",
              pieces: "14 textos",
              time: "3 h 42 min",
              progress: [50, 40, 75, 80, 30, 60, 90],
              color: "border-emerald-500/30 bg-emerald-500/5",
              accent: "bg-emerald-500"
            },
            {
              name: "Work, Craft & Careers",
              pieces: "6 textos",
              time: "1 h 50 min",
              progress: [90, 75, 60, 85],
              color: "border-amber-500/30 bg-amber-500/5",
              accent: "bg-amber-500"
            },
            {
              name: "Writing & Thought",
              pieces: "1 texto",
              time: "40 min",
              progress: [30, 70],
              color: "border-red-500/30 bg-red-500/5",
              accent: "bg-red-500"
            },
            {
              name: "Security & Auditing",
              pieces: "1 texto",
              time: "25 min",
              progress: [60],
              color: "border-cyan-500/30 bg-cyan-500/5",
              accent: "bg-cyan-500"
            }
          ].map((topic, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                setShelfFilter(topic.name.split(" ")[0]);
                setViewMode("shelf");
              }}
              className={`cursor-pointer rounded-3xl border ${topic.color} p-5 transition-all shadow-sm flex flex-col justify-between`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa] block mb-1">
                  Coleção Temática
                </span>
                <h3 className="font-display text-lg font-semibold text-white mb-1">
                  {topic.name}
                </h3>
                <p className="text-xs text-[#71717a]">
                  {topic.pieces} · {topic.time}
                </p>
              </div>

              {/* Reading time / completion bar chart (from Video 1) */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <div className="flex items-end gap-1.5 h-12">
                  {topic.progress.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-t-sm bg-white/20 transition-all hover:bg-white"
                      style={{ height: `${val}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-[#71717a]">
                  <span>Progresso do cluster</span>
                  <span className="text-white font-medium">Abrir estante →</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Floating Grok Bot Toast Notification (from Video 1) */}
      <AnimatePresence>
        {agentToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#18181b]/95 px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-xl max-w-md w-[calc(100%-2rem)]"
          >
            <div className="size-2 rounded-full bg-purple-400 animate-ping" />
            <div className="flex-1 truncate">
              <span className="font-semibold text-purple-300">{agentToast.bot}</span>
              <span className="text-[#a1a1aa] ml-1.5">adicionou novos artigos</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setViewMode("shelf");
                setAgentToast((t) => ({ ...t, visible: false }));
              }}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/20 transition"
            >
              Ver na estante
            </button>
            <button
              type="button"
              onClick={() => setAgentToast((t) => ({ ...t, visible: false }))}
              className="text-[#71717a] hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AddSourceModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onBotImportTriggered={handleBotImport}
      />

      <GlossEditionModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />
    </div>
  );
}
