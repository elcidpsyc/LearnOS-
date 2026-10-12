import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Calendar,
  Flame,
  ChevronRight,
  Plus,
  Trash2,
  Layers,
  HelpCircle
} from "lucide-react";
import confetti from "canvas-confetti";
import { useVault, FONTE_LABEL, type Card } from "@/lib/vault/store";
import { cn } from "@/lib/utils";

export function ReviewTab() {
  const cards = useVault((s) => s.cards);
  const reviewCard = useVault((s) => s.reviewCard);
  const addCard = useVault((s) => s.addCard);
  const deleteCard = useVault((s) => s.deleteCard);

  const todayStr = new Date().toISOString().slice(0, 10);
  const dueCards = cards.filter((c) => c.proxima <= todayStr && c.qualidade < 3);
  const sessionQueue = dueCards.length > 0 ? dueCards : cards.slice(0, 5);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newTag, setNewTag] = useState("Princípios");

  const currentCard = sessionQueue[currentIndex] || null;

  const handleRate = (rating: number) => {
    if (!currentCard) return;

    reviewCard(currentCard.id, rating);
    setFlipped(false);

    if (currentIndex + 1 < sessionQueue.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionCompleted(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setSessionCompleted(false);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    addCard({
      frente: newFront.trim(),
      verso: newBack.trim(),
      proxima: todayStr,
      qualidade: 1,
      revisoes: 0,
      fonte: "fde_guide",
      tags: [newTag.trim()]
    });

    setNewFront("");
    setNewBack("");
    setShowDeckModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
            Repetição Espaçada
          </h2>
          <p className="text-xs text-[#a1a1aa]">
            Fixação mnemônica ativa via algoritmos de curva do esquecimento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            <Flame className="size-3.5 fill-amber-400" />
            <span>5 dias streak</span>
          </div>

          <button
            type="button"
            onClick={() => setShowDeckModal(true)}
            className="rounded-full border border-[#27272a] bg-[#18181b] p-2 text-[#a1a1aa] hover:border-white/20 hover:text-white transition"
            title="Ver Baralho Completo"
          >
            <Layers className="size-4" />
          </button>
        </div>
      </div>

      {/* Progress pill indicator */}
      {!sessionCompleted && currentCard && (
        <div className="flex items-center justify-between rounded-2xl border border-[#27272a] bg-[#18181b] px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
              Sessão Ativa
            </span>
            <span className="font-mono text-white font-semibold">
              {currentIndex + 1} / {sessionQueue.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-28 rounded-full bg-[#27272a] overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / sessionQueue.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-[#71717a]">
              {dueCards.length} pendentes
            </span>
          </div>
        </div>
      )}

      {/* Spaced repetition flashcard session */}
      {sessionCompleted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-[#27272a] bg-[#18181b] p-8 text-center shadow-border space-y-4"
        >
          <div className="mx-auto size-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="size-7" />
          </div>

          <h3 className="font-display text-2xl font-semibold text-white">
            Sessão Concluída!
          </h3>

          <p className="text-xs text-[#a1a1aa] max-w-sm mx-auto leading-relaxed">
            Você revisou todos os conceitos agendados para hoje. Sua retenção sináptica está calibrada.
          </p>

          <div className="flex items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-neutral-200 transition"
            >
              <RotateCcw className="size-3.5" />
              Revisar Novamente
            </button>
          </div>
        </motion.div>
      ) : currentCard ? (
        <div className="space-y-4">
          {/* Tactile Motion Flashcard Container with Flip Animation */}
          <div
            className="relative min-h-[340px] w-full cursor-pointer perspective-1000"
            onClick={() => setFlipped(!flipped)}
          >
            <motion.div
              className="relative size-full min-h-[340px] rounded-3xl border border-[#27272a] bg-gradient-to-b from-[#18181b] to-[#121214] p-6 text-white shadow-border flex flex-col justify-between transition-all hover:border-white/20 select-none"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {!flipped ? (
                /* Card Front */
                <div className="flex flex-col justify-between size-full flex-1">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa]">
                        Pergunta · {FONTE_LABEL[currentCard.fonte] || currentCard.fonte}
                      </span>
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-mono text-amber-400">
                        Nível {currentCard.qualidade}/5
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-medium leading-snug text-white">
                      {currentCard.frente}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-[#71717a]">
                    <div className="flex items-center gap-1.5">
                      {currentCard.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-[#a1a1aa] font-medium">
                      Toque para virar o card →
                    </span>
                  </div>
                </div>
              ) : (
                /* Card Back */
                <div
                  className="flex flex-col justify-between size-full flex-1"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                        ✓ Resposta / Síntese
                      </span>
                      <span className="text-[10px] font-mono text-[#71717a]">
                        Revisões: {currentCard.revisoes}
                      </span>
                    </div>

                    <p className="font-serif text-base leading-relaxed text-[#fafafa] bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                      {currentCard.verso}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa] mb-2">
                      Como foi sua recordação ativa?
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Spaced Repetition Rating Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleRate(1)}
              className="flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-red-400 transition hover:bg-red-500/20 active:scale-95"
            >
              <span className="text-[11px] font-bold">Errei</span>
              <span className="text-[9px] opacity-70">1 dia</span>
            </button>
            <button
              type="button"
              onClick={() => handleRate(2)}
              className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-400 transition hover:bg-amber-500/20 active:scale-95"
            >
              <span className="text-[11px] font-bold">Difícil</span>
              <span className="text-[9px] opacity-70">2 dias</span>
            </button>
            <button
              type="button"
              onClick={() => handleRate(3)}
              className="flex flex-col items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-400 transition hover:bg-blue-500/20 active:scale-95"
            >
              <span className="text-[11px] font-bold">Bom</span>
              <span className="text-[9px] opacity-70">4 dias</span>
            </button>
            <button
              type="button"
              onClick={() => handleRate(5)}
              className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400 transition hover:bg-emerald-500/20 active:scale-95"
            >
              <span className="text-[11px] font-bold">Fácil</span>
              <span className="text-[9px] opacity-70">7 dias</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Deck & Schedule Modal */}
      <AnimatePresence>
        {showDeckModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#27272a] bg-[#18181b] p-6 text-white shadow-border"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold">Baralho de Cards ({cards.length})</h3>
                  <p className="text-xs text-[#a1a1aa]">Gerencie ou adicione perguntas para memorização</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeckModal(false)}
                  className="rounded-full p-1 text-[#71717a] hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Quick Card Form */}
              <form onSubmit={handleCreateCard} className="space-y-3 mb-6 rounded-2xl bg-[#09090b] p-4 border border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                  Criar Novo Card
                </span>
                <input
                  type="text"
                  required
                  placeholder="Pergunta do card (Frente)..."
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                />
                <textarea
                  rows={2}
                  required
                  placeholder="Resposta exata (Verso)..."
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-white outline-none focus:border-white/40 resize-none"
                />
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    placeholder="Tag (ex: Arquitetura)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-36 rounded-xl border border-[#27272a] bg-[#18181b] px-2.5 py-1 text-xs text-white outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200"
                  >
                    Salvar Card
                  </button>
                </div>
              </form>

              {/* Cards List */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
                  Cards Cadastrados
                </span>
                {cards.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-[#27272a] bg-[#09090b]/80 p-3.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white mb-1">{c.frente}</p>
                      <p className="text-[#a1a1aa] text-[11px] line-clamp-2">{c.verso}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-[#71717a]">
                        <span>Próxima: {c.proxima}</span>
                        <span>· Qualidade: {c.qualidade}/5</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCard(c.id)}
                      className="text-[#71717a] hover:text-red-400 p-1"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
