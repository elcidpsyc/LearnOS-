import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Library, RotateCcw, StickyNote, Waypoints, Sparkles } from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { hydrateVault, useVault, type TabId } from "@/lib/vault/store";
import { getAiStatus } from "@/lib/study/ai";
import { StudyTab } from "./study-tab";
import { NotesTab } from "./notes-tab";
import { ReviewTab } from "./review-tab";
import { MapTab } from "./map-tab";
import { SourcesTab } from "./sources-tab";
import { TranslatorPopup } from "./translator-popup";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "estudar", label: "Estudar", icon: BookOpen },
  { id: "notas", label: "Notas", icon: StickyNote },
  { id: "revisar", label: "Revisar", icon: RotateCcw },
  { id: "mapa", label: "Mapa", icon: Waypoints },
  { id: "fontes", label: "Fontes", icon: Library },
];

export function LearningOS() {
  const tab = useVault((s) => s.tab);
  const setTab = useVault((s) => s.setTab);
  const cards = useVault((s) => s.cards);
  const [aiOn, setAiOn] = useState(false);

  useEffect(() => {
    useVault.setState({ hydrated: true });
    hydrateVault();
    void getAiStatus().then((r) => setAiOn(Boolean(r?.available))).catch(() => setAiOn(false));
  }, []);

  const due = cards.filter((c) => c.proxima <= new Date().toISOString().slice(0, 10) && c.qualidade < 3).length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col bg-[#09090b] text-[#fafafa] selection:bg-white selection:text-black">
      {/* Studio Header */}
      <header className="sticky top-0 z-20 px-6 py-6 transition-all duration-300 backdrop-blur-xl bg-[#09090b]/85 border-b border-white/[0.04]">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1a1aa]">Learning OS</p>
              <span className="size-1 rounded-full bg-[#71717a]" />
              <span className="text-[10px] font-mono text-[#71717a] flex items-center gap-1">
                <Sparkles className="size-2.5 text-amber-400" /> Nutlope Dynamic
              </span>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Entender e lembrar
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-[#d4d4d8]">
              <span className={`size-1.5 rounded-full ${aiOn ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
              <span className="text-[10px] uppercase font-mono">IA Ativa</span>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Main Content View with Framer Motion AnimatePresence Transitions */}
      <main className="flex-1 px-6 pt-6 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {due > 0 && tab !== "revisar" && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setTab("revisar")}
                className="mb-6 flex w-full items-center justify-between rounded-2xl border border-[#27272a] bg-[#18181b] px-4 py-3.5 text-sm transition-all hover:bg-[#27272a] shadow-sm"
              >
                <span className="flex items-center gap-2.5 text-xs font-medium text-white">
                  <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                  Revisar {due} card{due > 1 ? "s" : ""} pendentes na fila
                </span>
                <span className="text-xs font-semibold text-[#a1a1aa] hover:text-white">
                  Abrir agora →
                </span>
              </motion.button>
            )}
            
            {tab === "estudar" && <StudyTab aiOn={aiOn} />}
            {tab === "notas" && <NotesTab />}
            {tab === "revisar" && <ReviewTab />}
            {tab === "mapa" && <MapTab />}
            {tab === "fontes" && <SourcesTab aiOn={aiOn} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Nav Pill - Estilo Nutlope */}
      <nav className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[420px] -translate-x-1/2">
        <ul className="grid grid-cols-5 gap-1 rounded-full border border-white/10 bg-[#18181b]/85 p-1.5 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "relative flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-full transition-all duration-300",
                    active ? "text-white" : "text-[#71717a] hover:text-[#d4d4d8]"
                  )}
                >
                  {active && (
                    <motion.div 
                      layoutId="nav-pill" 
                      className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/20" 
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <Icon className={cn("size-4 z-10", active ? "stroke-[2.5px] text-white" : "stroke-[1.5px]")} />
                  <span className="z-10 text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Floating Pop-over & Toaster */}
      <TranslatorPopup />
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}
