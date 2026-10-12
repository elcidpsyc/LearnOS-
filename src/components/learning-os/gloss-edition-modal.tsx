import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookOpen,
  Headphones,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Printer,
  Sparkles,
  Volume2
} from "lucide-react";
import { useVault } from "@/lib/vault/store";

interface GlossEditionModalProps {
  open: boolean;
  onClose: () => void;
}

export function GlossEditionModal({ open, onClose }: void | any) {
  const sources = useVault((s) => s.sources);
  const notes = useVault((s) => s.notes);
  const cards = useVault((s) => s.cards);

  const [pageIndex, setPageIndex] = useState(0);
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
  const [editionName, setEditionName] = useState("Edição de Outubro");
  const [orderPlaced, setOrderPlaced] = useState(false);

  const bookPages = [
    {
      title: "Capa da Edição",
      type: "cover",
      content: editionName,
      sub: "Tudo o que você compreendeu, sintetizado e encadernado."
    },
    {
      title: "Folha de Rosto",
      type: "title",
      content: "Learning OS — Gloss Edition",
      sub: "Sobre fazer um trabalho excepcional e as máquinas aprendendo a ajudar."
    },
    {
      title: "The Bitter Lesson",
      type: "article",
      author: "Rich Sutton",
      highlight: "A maior lição dos últimos 70 anos de pesquisa em IA é que métodos gerais que alavancam computação são invariavelmente os mais eficazes."
    },
    {
      title: "You and Your Research",
      type: "article",
      author: "Richard Hamming",
      highlight: "Conhecimento e produtividade são como juros compostos. Quem produz 10% a mais dobra o output ao longo da carreira."
    },
    {
      title: "The Rise of the Forward Deployed Engineer",
      type: "article",
      author: "Vinoo Ganesh",
      highlight: "FDEs resolvem gargalos de última milha para retroalimentar o produto central com abstrações reutilizáveis."
    }
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative my-8 w-full max-w-4xl rounded-3xl border border-[#27272a] bg-[#18181b] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.9)] lg:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-[#71717a] hover:bg-white/10 hover:text-white transition"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1a1aa] flex items-center gap-2">
            <Sparkles className="size-3 text-amber-400" />
            Gloss Editions · O Seu Livro Físico
          </span>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white">
            Imprima e receba seu livro em casa
          </h2>
          <p className="text-xs text-[#a1a1aa]">
            Tudo o que você salvou no Learning OS, com suas anotações e destaques, diagramado como um livro formato 6×9.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* 3D Flipbook Preview Area */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="relative min-h-[360px] w-full max-w-sm rounded-2xl border border-white/10 bg-[#09090b] p-6 shadow-2xl flex flex-col justify-between">
              {/* Spine shadow indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/80 to-transparent rounded-l-2xl" />

              <div>
                <span className="text-[10px] font-mono uppercase text-[#71717a]">
                  Página {pageIndex + 1} de {bookPages.length} · Gloss Print
                </span>

                <div className="mt-8 space-y-4">
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {bookPages[pageIndex].title}
                  </h3>

                  {bookPages[pageIndex].author && (
                    <p className="text-xs text-[#a1a1aa]">
                      Por {bookPages[pageIndex].author}
                    </p>
                  )}

                  {bookPages[pageIndex].highlight && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="font-serif italic text-sm text-[#e4e4e7] leading-relaxed">
                        "{bookPages[pageIndex].highlight}"
                      </p>
                    </div>
                  )}

                  {bookPages[pageIndex].sub && (
                    <p className="text-xs text-[#d4d4d8] leading-relaxed">
                      {bookPages[pageIndex].sub}
                    </p>
                  )}
                </div>
              </div>

              {/* Page Controls */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <button
                  type="button"
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="size-4" /> Anterior
                </button>
                <span className="text-xs font-mono text-[#71717a]">
                  {bookPages[pageIndex].title}
                </span>
                <button
                  type="button"
                  disabled={pageIndex === bookPages.length - 1}
                  onClick={() => setPageIndex((p) => Math.min(bookPages.length - 1, p + 1))}
                  className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-30 transition"
                >
                  Próxima <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-[#71717a] text-center">
              Livro físico em papel creme 80g com capa fosca e suas notas na margem.
            </p>
          </div>

          {/* Edition Details & Podcast Panel */}
          <div className="lg:col-span-5 space-y-4">
            {/* Audio Podcast Player (Gloss Video 2 feature!) */}
            <div className="rounded-2xl border border-[#27272a] bg-[#09090b] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Headphones className="size-3.5" />
                  Ouvir como Podcast
                </span>
                <span className="text-[10px] text-[#71717a]">14 minutos</span>
              </div>

              <p className="text-xs text-[#d4d4d8] leading-snug">
                Dois apresentadores de IA discutem suas leituras de outubro, destacando seus insights e conexões.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPlayingPodcast(!isPlayingPodcast)}
                  className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200 transition"
                >
                  {isPlayingPodcast ? (
                    <>
                      <Pause className="size-3.5 fill-black" /> Pausar
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 fill-black" /> Gerar & Ouvir
                    </>
                  )}
                </button>

                {isPlayingPodcast && (
                  <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono animate-pulse">
                    <Volume2 className="size-4" /> Tocando episódio...
                  </div>
                )}
              </div>
            </div>

            {/* Articles Included in Edition */}
            <div className="rounded-2xl border border-[#27272a] bg-[#09090b] p-4 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block">
                Conteúdo Incluído nesta Edição
              </span>

              <div className="space-y-1.5 text-xs">
                {sources.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-[#a1a1aa]">
                    <span className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-400" />
                      <span className="text-white font-medium">{s.title.slice(0, 26)}...</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#71717a]">{s.pages} págs</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-[#a1a1aa]">
                <span>Total: 5 textos · 184 páginas</span>
                <span className="text-white font-semibold">{notes.length} anotações</span>
              </div>
            </div>

            {/* Buy / Print Action */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
              <div>
                <span className="font-display text-2xl font-bold text-white">$25</span>
                <span className="text-[11px] text-[#71717a] block">Frete global incluso</span>
              </div>

              {orderPlaced ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                  <Check className="size-4" /> Pedido Registrado!
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setOrderPlaced(true)}
                  className="flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-neutral-200 transition"
                >
                  <Printer className="size-4" />
                  Imprimir e Enviar
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
