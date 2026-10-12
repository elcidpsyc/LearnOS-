import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Bookmark,
  Share2,
  Trash2,
  Send,
  Type,
  BookOpen,
  MessageSquareQuote
} from "lucide-react";
import { useVault } from "@/lib/vault/store";
import { askAboutText } from "@/lib/study/ai";

interface StudyTabProps {
  aiOn?: boolean;
}

export function StudyTab({ aiOn = true }: StudyTabProps) {
  const sources = useVault((s) => s.sources);
  const activeSourceId = useVault((s) => s.activeSourceId);
  const setActiveSourceId = useVault((s) => s.setActiveSourceId);
  const marginNotes = useVault((s) => s.marginNotes);
  const addMarginNote = useVault((s) => s.addMarginNote);
  const deleteMarginNote = useVault((s) => s.deleteMarginNote);
  const openPopup = useVault((s) => s.openPopup);

  const currentSource = sources.find((s) => s.id === activeSourceId) || sources[0];
  const activeMarginNotes = marginNotes.filter((m) => m.sourceId === currentSource.id);

  const [briefOpen, setBriefOpen] = useState(false);
  const [fontMode, setFontMode] = useState<"serif" | "sans">("serif");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [quickQuestion, setQuickQuestion] = useState("");
  const [askMode, setAskMode] = useState<"quick" | "deep">("quick");
  const [isAsking, setIsAsking] = useState(false);
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);

  const handleTextSelection = (paragraphId: number) => {
    const selection = window.getSelection();
    const text = selection?.toString()?.trim();
    if (!text || text.length < 2) return;

    // Get position for popover
    let left = 20;
    let top = 180;
    if (selection && selection.rangeCount > 0) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      left = rect.left;
      top = rect.bottom + 8;
    }

    openPopup({
      text,
      left,
      top,
      paragraphId,
      mode: "explain"
    });
  };

  const handleAskWholeText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuestion.trim() || isAsking) return;

    setIsAsking(true);
    const q = quickQuestion.trim();
    setQuickQuestion("");

    const answer = await askAboutText(q, currentSource.briefSummary + " " + currentSource.claims.join(" "));

    addMarginNote({
      sourceId: currentSource.id,
      paragraphId: selectedParagraph || 1,
      type: "qa",
      title: `Pergunta: ${q}`,
      content: answer,
      quote: askMode === "deep" ? "Análise Profunda" : "Pergunta Rápida"
    });

    setIsAsking(false);
  };

  return (
    <div className="space-y-8">
      {/* Source Switcher Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              {currentSource.topic}
            </span>
            <span className="text-xs text-[#71717a]">· {currentSource.readTime}</span>
          </div>

          {/* Typography & Switcher Tools */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFontMode((f) => (f === "serif" ? "sans" : "serif"))}
              className="flex items-center gap-1 rounded-xl border border-[#27272a] bg-[#18181b] px-2.5 py-1 text-xs text-[#a1a1aa] transition hover:border-white/20 hover:text-white"
              title="Alternar tipografia"
            >
              <Type className="size-3.5" />
              <span className="font-mono text-[10px] uppercase">{fontMode}</span>
            </button>

            <select
              aria-label="Selecionar texto para estudo"
              value={currentSource.id}
              onChange={(e) => setActiveSourceId(e.target.value)}
              className="rounded-xl border border-[#27272a] bg-[#18181b] px-2.5 py-1 text-xs text-[#fafafa] outline-none transition focus:border-white/40 cursor-pointer"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#18181b] text-white">
                  {s.title.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-2xl font-semibold tracking-tight text-white leading-tight md:text-3xl">
          {currentSource.title}
        </h2>

        <div className="flex items-center justify-between text-xs text-[#a1a1aa] pb-3 border-b border-[#27272a]">
          <p>
            Por <span className="text-white font-medium">{currentSource.author}</span> · {currentSource.publishedYear}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-[#27272a] overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-500 rounded-full"
                style={{ width: `${currentSource.progress}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-[#71717a]">{currentSource.progress}% lido</span>
          </div>
        </div>
      </div>

      {/* Collapsible Brief Accordion (Gloss pattern) */}
      <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-4 transition-colors">
        <button
          type="button"
          onClick={() => setBriefOpen(!briefOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Brief Executivo & Teses Chave ({currentSource.claims.length} premissas)
            </span>
          </div>
          {briefOpen ? (
            <ChevronUp className="size-4 text-[#71717a]" />
          ) : (
            <ChevronDown className="size-4 text-[#71717a]" />
          )}
        </button>

        <AnimatePresence>
          {briefOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-[#27272a]/60 space-y-3 text-xs leading-relaxed text-[#d4d4d8]">
                <p className="font-medium text-white italic bg-[#27272a]/40 p-2.5 rounded-xl border border-white/5">
                  "{currentSource.briefSummary}"
                </p>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
                    Premissas Centrais:
                  </span>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[#a1a1aa]">
                    {currentSource.claims.map((claim, idx) => (
                      <li key={idx}>
                        <span className="text-[#fafafa] font-medium">{claim}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active Reading Layout */}
      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Text Content Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#71717a] flex items-center gap-2">
            <BookOpen className="size-3.5" />
            <span>Selecione qualquer palavra para traduzir, explicar ou criar card</span>
          </div>

          <article
            className={`space-y-6 leading-relaxed transition-all ${
              fontMode === "serif" ? "font-serif text-[17px] text-[#e4e4e7]" : "font-sans text-[15px] text-[#f4f4f5]"
            } ${fontSize === "lg" ? "text-lg" : fontSize === "sm" ? "text-sm" : ""}`}
            onMouseUp={() => handleTextSelection(selectedParagraph || 1)}
            onTouchEnd={() => handleTextSelection(selectedParagraph || 1)}
          >
            {currentSource.paragraphs.map((p) => {
              const hasNotes = activeMarginNotes.some((m) => m.paragraphId === p.id);
              const isSelected = selectedParagraph === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedParagraph(p.id)}
                  className={`group relative rounded-2xl p-3 -mx-3 transition-colors ${
                    isSelected ? "bg-white/[0.04] ring-1 ring-white/10" : "hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Paragraph Number Badge */}
                  <span
                    className={`absolute -left-7 top-3 select-none font-mono text-[11px] transition-colors ${
                      hasNotes
                        ? "text-amber-400 font-bold"
                        : "text-[#52525b] group-hover:text-[#a1a1aa]"
                    }`}
                  >
                    {p.id}
                  </span>

                  <p className="relative">
                    {p.firstLetterDrop ? (
                      <>
                        <span className="float-left mr-3 font-editorial text-5xl font-normal leading-none text-white select-none">
                          {p.text[0]}
                        </span>
                        {p.text.slice(1)}
                      </>
                    ) : (
                      p.text
                    )}
                  </p>

                  {/* Paragraph quick trigger button */}
                  <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPopup({
                          text: p.text.slice(0, 120),
                          paragraphId: p.id,
                          left: 40,
                          top: 240,
                          mode: "explain"
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-[#d4d4d8] hover:bg-white/20 hover:text-white"
                    >
                      <Sparkles className="size-3 text-amber-300" />
                      Analisar parágrafo {p.id}
                    </button>
                    {hasNotes && (
                      <span className="text-[10px] font-medium text-amber-400">
                        • Tem nota na margem
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </article>
        </div>

        {/* Gloss Margin Notes Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-dashed border-[#27272a] bg-[#18181b]/40 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa] mb-1">
              Margem de Notas
            </p>
            <p className="text-[11px] text-[#71717a] leading-tight">
              Glosses e respostas da IA ancoradas aos parágrafos da leitura.
            </p>
          </div>

          <div className="space-y-3">
            {activeMarginNotes.length === 0 ? (
              <div className="rounded-2xl border border-[#27272a] bg-[#18181b]/50 p-4 text-center text-xs text-[#71717a]">
                Nenhuma anotação nesta página ainda. Selecione texto ou pergunte abaixo.
              </div>
            ) : (
              activeMarginNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group relative rounded-2xl border border-[#27272a] bg-[#18181b] p-3.5 transition hover:border-white/20 shadow-sm"
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-amber-400 font-semibold">
                      § {note.paragraphId} · {note.type === "explain" ? "Gloss" : "Q&A"}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteMarginNote(note.id)}
                      className="text-[#71717a] hover:text-red-400 transition-colors p-1"
                      title="Excluir nota"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>

                  {note.quote && (
                    <p className="font-serif italic text-[11px] text-[#a1a1aa] mb-1.5 border-l-2 border-white/20 pl-2">
                      "{note.quote}"
                    </p>
                  )}

                  <h4 className="text-xs font-semibold text-white mb-1">
                    {note.title}
                  </h4>
                  <p className="text-xs text-[#d4d4d8] leading-relaxed">
                    {note.content}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Gloss Floating Bottom Ask Bar */}
      <div className="sticky bottom-24 z-20 mx-auto max-w-2xl rounded-2xl border border-[#27272a] bg-[#18181b]/95 p-2 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
        <form onSubmit={handleAskWholeText} className="flex items-center gap-2">
          <div className="flex items-center gap-1 pl-2 text-[#71717a]">
            <Sparkles className="size-4 text-amber-400" />
          </div>

          <input
            type="text"
            value={quickQuestion}
            onChange={(e) => setQuickQuestion(e.target.value)}
            placeholder="Perguntar sobre o texto inteiro ou parágrafo..."
            className="flex-1 bg-transparent px-2 text-xs text-white placeholder-[#71717a] outline-none"
          />

          {/* Quick / Deep Toggle Pill */}
          <div className="flex items-center rounded-xl bg-[#09090b] p-0.5 border border-[#27272a]">
            <button
              type="button"
              onClick={() => setAskMode("quick")}
              className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                askMode === "quick" ? "bg-white text-black font-semibold" : "text-[#71717a] hover:text-white"
              }`}
            >
              Quick
            </button>
            <button
              type="button"
              onClick={() => setAskMode("deep")}
              className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                askMode === "deep" ? "bg-white text-black font-semibold" : "text-[#71717a] hover:text-white"
              }`}
            >
              Deep
            </button>
          </div>

          <button
            type="submit"
            disabled={!quickQuestion.trim() || isAsking}
            className="flex items-center justify-center rounded-xl bg-white text-black size-8 hover:bg-neutral-200 transition-colors disabled:opacity-40"
          >
            {isAsking ? (
              <div className="size-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
