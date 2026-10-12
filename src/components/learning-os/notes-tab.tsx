import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Tag,
  Trash2,
  Edit3,
  Check,
  X,
  ExternalLink,
  BookOpen,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVault, FONTE_LABEL, type Note } from "@/lib/vault/store";

export function NotesTab() {
  const notes = useVault((s) => s.notes);
  const selectedNoteId = useVault((s) => s.selectedNoteId);
  const selectNote = useVault((s) => s.selectNote);
  const addNote = useVault((s) => s.addNote);
  const updateNote = useVault((s) => s.updateNote);
  const deleteNote = useVault((s) => s.deleteNote);
  const addCard = useVault((s) => s.addCard);
  const setActiveSourceId = useVault((s) => s.setActiveSourceId);
  const setTab = useVault((s) => s.setTab);

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTag, setNewTag] = useState("Ideias");
  const [newSource, setNewSource] = useState("fde_guide");
  const [newPages, setNewPages] = useState("1");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const activeNote = notes.find((n) => n.id === selectedNoteId) || null;

  // Collect all unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesTag = selectedTag === "all" || n.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addNote({
      title: newTitle.trim(),
      content: newContent.trim() || "Sem detalhes adicionais.",
      fonte: newSource,
      paginas: `p. ${newPages}`,
      tags: [newTag.trim() || "Geral"],
      createdAt: new Date().toISOString().slice(0, 10),
      highlights: []
    });

    setNewTitle("");
    setNewContent("");
    setIsCreating(false);
  };

  const handleStartEdit = (note: Note) => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!activeNote) return;
    updateNote(activeNote.id, {
      title: editTitle,
      content: editContent
    });
    setIsEditing(false);
  };

  const handleConvertToCard = (note: Note) => {
    addCard({
      frente: `O que diz a nota: "${note.title}"?`,
      verso: note.content,
      proxima: new Date().toISOString().slice(0, 10),
      qualidade: 1,
      revisoes: 0,
      fonte: note.fonte,
      tags: note.tags
    });
    setTab("revisar");
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
              Caderno de Conhecimento
            </h2>
            <p className="text-xs text-[#a1a1aa]">
              {notes.length} notas sintetizadas com referências exatas
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black transition hover:bg-neutral-200 shadow-sm"
          >
            <Plus className="size-3.5" />
            Nova Nota
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#71717a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por conceito, trecho ou tag..."
            className="w-full rounded-2xl border border-[#27272a] bg-[#18181b] py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#71717a] outline-none transition focus:border-white/30"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedTag("all")}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap",
              selectedTag === "all"
                ? "bg-white text-black font-semibold"
                : "bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white"
            )}
          >
            Todas ({notes.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap",
                selectedTag === tag
                  ? "bg-white text-black font-semibold"
                  : "bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* New Note Creator Modal / Drawer */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-3xl border border-[#27272a] bg-[#18181b] p-5 shadow-border overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="size-3.5 text-amber-400" />
                Criar Nova Nota de Estudo
              </span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-[#71717a] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-1">
                  Título da Nota
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Lei de Amdahl aplicada a clusters distribuídos"
                  className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-3 py-2 text-xs text-white placeholder-[#71717a] outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-1">
                  Conteúdo / Síntese
                </label>
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Escreva sua síntese com suas próprias palavras..."
                  className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-3 py-2 text-xs text-white placeholder-[#71717a] outline-none focus:border-white/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-1">
                    Tag
                  </label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-1">
                    Fonte
                  </label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    {Object.entries(FONTE_LABEL).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label.slice(0, 18)}...
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-1">
                    Página
                  </label>
                  <input
                    type="text"
                    value={newPages}
                    onChange={(e) => setNewPages(e.target.value)}
                    className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-xl border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200"
                >
                  Salvar Nota
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Note Inspector / Modal */}
      <AnimatePresence>
        {activeNote && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="rounded-3xl border border-white/20 bg-[#18181b] p-5 shadow-border"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa]">
                  {FONTE_LABEL[activeNote.fonte] || activeNote.fonte} · {activeNote.paginas}
                </span>
                <span className="text-[10px] text-[#71717a]">· {activeNote.createdAt}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleConvertToCard(activeNote)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20 transition"
                  title="Converter nota em Flashcard"
                >
                  <Sparkles className="size-3 text-amber-400" />
                  Gerar Card
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSourceId(activeNote.fonte);
                    setTab("estudar");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20 transition"
                  title="Abrir no leitor"
                >
                  <BookOpen className="size-3" />
                  Leitor
                </button>
                <button
                  type="button"
                  onClick={() => deleteNote(activeNote.id)}
                  className="rounded-xl p-1.5 text-[#71717a] hover:text-red-400 transition"
                  title="Deletar nota"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => selectNote(null)}
                  className="rounded-xl p-1.5 text-[#71717a] hover:text-white transition"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm font-semibold text-white outline-none"
                />
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-3 py-2 text-xs text-white outline-none resize-none leading-relaxed"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-[#27272a] px-3 py-1 text-xs text-[#a1a1aa]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-black"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display text-xl font-semibold text-white">
                    {activeNote.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(activeNote)}
                    className="text-[#71717a] hover:text-white transition p-1"
                  >
                    <Edit3 className="size-3.5" />
                  </button>
                </div>

                <p className="text-xs text-[#d4d4d8] leading-relaxed whitespace-pre-wrap mb-4">
                  {activeNote.content}
                </p>

                {activeNote.highlights && activeNote.highlights.length > 0 && (
                  <div className="rounded-2xl bg-[#09090b] p-3 border border-white/5 space-y-1.5 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
                      Trechos Destacados no Texto
                    </span>
                    {activeNote.highlights.map((h, i) => (
                      <p key={i} className="font-serif italic text-xs text-[#a1a1aa] border-l-2 border-amber-400/40 pl-2">
                        "{h}"
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  {activeNote.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-mono text-[#a1a1aa]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reactive Motion Cards List (Nutlope Tactile Dynamic) */}
      <ul className="space-y-3">
        {filteredNotes.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-[#27272a] p-8 text-center text-xs text-[#71717a]">
            Nenhuma nota encontrada para a busca atual.
          </li>
        ) : (
          filteredNotes.map((n) => (
            <motion.li
              key={n.id}
              whileHover={{ scale: 1.015, x: 4 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", bounce: 0.3 }}
            >
              <button
                type="button"
                onClick={() => selectNote(n.id)}
                className={cn(
                  "flex min-h-20 w-full flex-col items-start rounded-2xl border border-[#27272a] bg-[#18181b] p-4 text-left transition-all shadow-sm",
                  selectedNoteId === n.id
                    ? "ring-2 ring-white bg-[#27272a]"
                    : "hover:bg-[#27272a]/70 hover:border-white/20"
                )}
              >
                <div className="flex w-full items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa]">
                    {FONTE_LABEL[n.fonte] || n.fonte} · {n.paginas}
                  </span>
                  <div className="flex items-center gap-1">
                    {n.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-[#71717a]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <span className="font-display text-lg font-medium leading-tight text-white mb-1.5">
                  {n.title}
                </span>

                <p className="line-clamp-2 text-xs text-[#a1a1aa] leading-relaxed">
                  {n.content}
                </p>
              </button>
            </motion.li>
          ))
        )}
      </ul>
    </div>
  );
}
