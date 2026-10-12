import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Bot,
  Link,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Plus
} from "lucide-react";
import confetti from "canvas-confetti";
import { useVault } from "@/lib/vault/store";

interface AddSourceModalProps {
  open: boolean;
  onClose: () => void;
  onBotImportTriggered: (botName: string) => void;
}

export function AddSourceModal({
  open,
  onClose,
  onBotImportTriggered
}: AddSourceModalProps) {
  const addSource = useVault((s) => s.addSource);

  const [activeTab, setActiveTab] = useState<"agent" | "manual">("agent");
  const [selectedAgent, setSelectedAgent] = useState<"grok" | "claude" | "chatgpt">("grok");
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Manual form state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [topic, setTopic] = useState<any>("AI");
  const [summary, setSummary] = useState("");
  const [readTime, setReadTime] = useState("15 min read");

  if (!open) return null;

  const mcpCommand = `Add a custom MCP server called Gloss at https://gloss-library.together.ai/mcp with the header Authorization set to Bearer gls_8GF2AR8KDE3M9v2vHQMhpqZxT6h4U0v3`;
  const agentPrompt = `Go through my X bookmarks from the last month, find the ones that link to articles, essays or papers, and save those links to my Gloss library.`;

  const handleCopyMcp = () => {
    navigator.clipboard?.writeText(mcpCommand);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard?.writeText(agentPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleTriggerAgentSync = () => {
    onBotImportTriggered(selectedAgent === "grok" ? "Grok Bot" : selectedAgent === "claude" ? "Claude" : "ChatGPT");
    onClose();
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addSource({
      title: title.trim(),
      author: author.trim() || "Autor Desconhecido",
      topic,
      readTime,
      pages: Math.floor(Math.random() * 20) + 12,
      spineColor: "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)",
      spineTextColor: "#ffffff",
      spineHeight: 180,
      spineWidth: 30,
      publishedYear: "2026",
      progress: 0,
      briefSummary: summary.trim() || "Artigo adicionado manualmente à biblioteca de aprendizagem.",
      claims: [
        "Insight preliminar capturado para leitura profunda.",
        "Aguardando leitura de primeiro ciclo e anotações."
      ],
      paragraphs: [
        {
          id: 1,
          firstLetterDrop: true,
          text: summary.trim() || "Artigo importado recentemente para estudo ativo."
        }
      ]
    });

    confetti({ particleCount: 50, spread: 50 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-3xl border border-[#27272a] bg-[#18181b] p-6 text-white shadow-border"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-4">
          <div className="flex items-center gap-1 rounded-xl bg-[#09090b] p-1 border border-[#27272a]">
            <button
              type="button"
              onClick={() => setActiveTab("agent")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                activeTab === "agent" ? "bg-white text-black" : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Conectar um agente
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                activeTab === "manual" ? "bg-white text-black" : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Salvar links manualmente
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#71717a] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {activeTab === "agent" ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                <Bot className="size-5 text-amber-400" />
                Deixe seu agente organizar sua estante
              </h3>
              <p className="text-xs text-[#a1a1aa] mt-1 leading-relaxed">
                O Gloss possui um servidor MCP. Conecte ao Grok Bot, Claude ou ChatGPT para filtrar seus bookmarks e salvar os melhores artigos categorizados na sua prateleira.
              </p>
            </div>

            {/* Agent Selector */}
            <div className="flex items-center gap-2">
              {[
                { id: "grok", label: "Grok Bot" },
                { id: "claude", label: "Claude" },
                { id: "chatgpt", label: "ChatGPT" }
              ].map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgent(agent.id as any)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    selectedAgent === agent.id
                      ? "border-white bg-white/10 text-white font-semibold"
                      : "border-[#27272a] text-[#71717a] hover:text-white"
                  }`}
                >
                  {agent.label}
                </button>
              ))}
            </div>

            {/* Step 1 Code */}
            <div className="rounded-2xl bg-[#09090b] p-3 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#a1a1aa]">
                <span className="font-mono">1. Diga isso no chat do {selectedAgent}:</span>
                <button
                  type="button"
                  onClick={handleCopyMcp}
                  className="flex items-center gap-1 text-[10px] text-white hover:text-amber-400 transition"
                >
                  {copiedMcp ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  {copiedMcp ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="font-mono text-[11px] text-[#d4d4d8] leading-tight break-all bg-[#18181b] p-2 rounded-xl">
                {mcpCommand}
              </p>
            </div>

            {/* Step 2 Prompt */}
            <div className="rounded-2xl bg-[#09090b] p-3 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#a1a1aa]">
                <span className="font-mono">2. Depois peça algo como:</span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-[10px] text-white hover:text-amber-400 transition"
                >
                  {copiedPrompt ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  {copiedPrompt ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="text-xs text-[#fafafa] italic bg-[#18181b] p-2 rounded-xl">
                "{agentPrompt}"
              </p>
            </div>

            {/* Action Simulator Button */}
            <button
              type="button"
              onClick={handleTriggerAgentSync}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-xs font-semibold text-black hover:bg-neutral-200 transition shadow-sm"
            >
              <Sparkles className="size-4 text-amber-500" />
              Sincronizar Artigos via {selectedAgent === "grok" ? "Grok Bot" : "Agente MCP"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveManual} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-1">
                Título do Artigo / Ensaio
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: The Anatomy of a High-Performance Team"
                className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-1">
                  Autor
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex: Martin Fowler"
                  className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-1">
                  Tópico
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="AI">AI</option>
                  <option value="Programming">Programming</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Data">Data</option>
                  <option value="Security">Security</option>
                  <option value="Startups">Startups</option>
                  <option value="Writing">Writing</option>
                  <option value="Work & careers">Work & careers</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-1">
                Resumo Inicial / URL
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Cole o link ou uma sinopse do conteúdo..."
                className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/40 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-white py-2.5 text-xs font-semibold text-black hover:bg-neutral-200 transition"
            >
              Adicionar à Estante
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
