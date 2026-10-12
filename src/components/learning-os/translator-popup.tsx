import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Languages, HelpCircle, Plus, Copy, Check, ArrowRight } from "lucide-react";
import { useVault } from "@/lib/vault/store";
import { translateText, explainConcept, generateFlashcardFromSelection } from "@/lib/study/ai";

export function TranslatorPopup() {
  const popup = useVault((s) => s.popup);
  const closePopup = useVault((s) => s.closePopup);
  const addMarginNote = useVault((s) => s.addMarginNote);
  const addCard = useVault((s) => s.addCard);
  const sources = useVault((s) => s.sources);
  const activeSourceId = useVault((s) => s.activeSourceId);

  const activeSource = sources.find((s) => s.id === activeSourceId) || sources[0];

  const [activeTab, setActiveTab] = useState<"translate" | "explain" | "card">("translate");
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [resultTitle, setResultTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);

  useEffect(() => {
    if (!popup.open || !popup.text) return;
    
    setActiveTab(popup.mode === "explain" ? "explain" : "translate");
    setActionDone(null);
    setCopied(false);

    let cancelled = false;
    setLoading(true);

    if (popup.mode === "explain") {
      explainConcept(popup.text).then((res) => {
        if (cancelled) return;
        setResultTitle(res.title);
        setResultText(res.content);
        setLoading(false);
      });
    } else {
      translateText(popup.text).then((res) => {
        if (cancelled) return;
        setResultTitle("Tradução para Português");
        setResultText(res);
        setLoading(false);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [popup.open, popup.text, popup.mode]);

  const handleSwitchTab = async (tab: "translate" | "explain" | "card") => {
    setActiveTab(tab);
    setLoading(true);
    setActionDone(null);

    if (tab === "translate") {
      const res = await translateText(popup.text);
      setResultTitle("Tradução para Português");
      setResultText(res);
    } else if (tab === "explain") {
      const res = await explainConcept(popup.text);
      setResultTitle(res.title);
      setResultText(res.content);
    } else if (tab === "card") {
      const res = await generateFlashcardFromSelection(popup.text, activeSource?.title || "Leitura");
      setResultTitle(res.frente);
      setResultText(res.verso);
    }
    setLoading(false);
  };

  const handleSaveToMargin = () => {
    addMarginNote({
      sourceId: activeSourceId,
      paragraphId: popup.paragraphId || 1,
      quote: popup.text,
      type: activeTab === "explain" ? "explain" : "note",
      title: resultTitle || popup.text.slice(0, 30),
      content: resultText
    });
    setActionDone("Nota salva na margem!");
    setTimeout(() => {
      closePopup();
    }, 900);
  };

  const handleCreateFlashcard = () => {
    addCard({
      frente: activeTab === "card" ? resultTitle : `O que significa: "${popup.text}"?`,
      verso: resultText,
      proxima: new Date().toISOString().slice(0, 10),
      qualidade: 1,
      revisoes: 0,
      fonte: activeSourceId,
      tags: ["Estudo", "Destaque"]
    });
    setActionDone("Flashcard adicionado ao deck!");
    setTimeout(() => {
      closePopup();
    }, 900);
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard?.writeText?.(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!popup.open) return null;

  // Keep within bounds
  const constrainedLeft = Math.max(16, Math.min(popup.left, (typeof window !== "undefined" ? window.innerWidth : 400) - 340));
  const constrainedTop = Math.max(60, popup.top);

  return (
    <AnimatePresence>
      <motion.div
        key="translator-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={closePopup}
      />
      <motion.div
        key="translator-popover"
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.4 }}
        className="fixed z-50 max-h-[min(76dvh,32rem)] w-[340px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl border border-[#27272a] bg-[#18181b] p-5 text-[#fafafa] shadow-[0_12px_40px_rgba(0,0,0,0.8)]"
        style={{
          left: `${constrainedLeft}px`,
          top: `${constrainedTop}px`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Sparkles className="size-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">
              Assistente de Gloss
            </span>
          </div>
          <button
            type="button"
            onClick={closePopup}
            className="rounded-full p-1 text-[#71717a] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Selected Quote */}
        <div className="my-3 rounded-xl bg-[#09090b]/80 p-2.5 border border-white/5">
          <p className="text-[10px] uppercase font-bold tracking-widest text-[#71717a] mb-1">
            Trecho Selecionado
          </p>
          <p className="font-serif italic text-sm text-[#fafafa] line-clamp-2">
            "{popup.text}"
          </p>
        </div>

        {/* Modes Pill Selector */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#09090b] p-1 border border-[#27272a] mb-3">
          <button
            type="button"
            onClick={() => handleSwitchTab("translate")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "translate"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-[#a1a1aa] hover:text-white"
            }`}
          >
            <Languages className="size-3.5" />
            Traduzir
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab("explain")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "explain"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-[#a1a1aa] hover:text-white"
            }`}
          >
            <HelpCircle className="size-3.5" />
            Explicar
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab("card")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "card"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-[#a1a1aa] hover:text-white"
            }`}
          >
            <Plus className="size-3.5" />
            Card
          </button>
        </div>

        {/* Dynamic AI Output */}
        <div className="min-h-[90px] rounded-2xl bg-[#27272a]/50 p-3.5 border border-white/5 mb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-4 gap-2 text-[#a1a1aa]">
              <div className="size-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <span className="text-xs">Sintetizando modelo mental...</span>
            </div>
          ) : (
            <div>
              {resultTitle && (
                <p className="text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {resultTitle}
                </p>
              )}
              <p className="text-xs leading-relaxed text-[#d4d4d8]">
                {resultText}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {actionDone ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-xs text-emerald-400 font-medium">
            <Check className="size-4" />
            {actionDone}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveToMargin}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white text-black py-2.5 text-xs font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              <ArrowRight className="size-3.5" />
              Fixar na Margem
            </button>
            <button
              type="button"
              onClick={handleCreateFlashcard}
              disabled={loading}
              className="flex items-center justify-center rounded-xl border border-[#27272a] bg-[#27272a]/80 p-2.5 text-xs text-white hover:bg-[#3f3f46] transition-colors"
              title="Salvar como Card de Revisão"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={loading}
              className="flex items-center justify-center rounded-xl border border-[#27272a] bg-[#27272a]/80 p-2.5 text-xs text-white hover:bg-[#3f3f46] transition-colors"
              title="Copiar texto"
            >
              {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
