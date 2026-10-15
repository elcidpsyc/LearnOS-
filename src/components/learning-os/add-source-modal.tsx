import { useState, useRef } from "react";
import { Link, AlignLeft, Upload, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useVault, snapshot } from "@/lib/vault/store";
import { sourceDraft, importLink } from "@/lib/study/import";
import { Modal } from "./ui";
import { FileImportPanel } from "./file-import-panel";
export function AddSourceModal({
  onClose,
  initialText = "",
  initialUrl = "",
}: {
  onClose: () => void;
  initialText?: string;
  initialUrl?: string;
}) {
  const addSource = useVault((s) => s.addSource);
  const setActiveSourceId = useVault((s) => s.setActiveSourceId);
  const setTab = useVault((s) => s.setTab);
  const [mode, setMode] = useState<"link" | "text" | "file">(
    initialUrl ? "link" : "text",
  );
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [topic, setTopic] = useState("Psicologia");
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [folder, setFolder] = useState("");
  const [readNow, setReadNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const finish = (target: string) => {
    setActiveSourceId(target);
    setTab(readNow ? "estudar" : "fontes");
    onClose();
    toast.success("Fonte adicionada à sua biblioteca.");
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "file") return;
    setBusy(true);
    setError("");
    try {
      const draft =
        mode === "link"
          ? await importLink(url, topic)
          : sourceDraft(
              title.trim(),
              text,
              author.trim() || "Autor não informado",
              topic,
            );
      if (mode === "text") draft.excerptOnly = true;
      draft.folder = folder.trim();
      const target = addSource(draft);
      finish(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível importar.");
    } finally {
      setBusy(false);
    }
  };
  const files = (selected: FileList | null) => {
    if (selected?.length) setQueue(Array.from(selected));
  };
  return (
    <Modal
      title="Adicionar à biblioteca"
      close={onClose}
      wide={mode === "file" && !!queue.length}
      className="import-modal"
    >
      <div className="segmented import-tabs">
        {[
          { id: "link", label: "Link", icon: Link },
          { id: "text", label: "Recorte", icon: AlignLeft },
          { id: "file", label: "Arquivo", icon: Upload },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={mode === id ? "active" : ""}
            onClick={() => setMode(id as typeof mode)}
            disabled={busy}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => void submit(e)} className="form-stack">
        {mode === "link" ? (
          <>
            <p className="form-intro">
              Salve um artigo com título, autor e texto para ler por aqui.
            </p>
            <label className="field">
              Endereço do artigo
              <input
                autoFocus
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>
          </>
        ) : mode === "text" ? (
          <>
            <label className="field">
              Título
              <input
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Livro, capítulo ou ideia…"
              />
            </label>
            <label className="field">
              Autor
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Quem escreveu este material?"
              />
            </label>
            <label className="field">
              Trecho para ler
              <textarea
                rows={7}
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cole o texto. O recorte será preservado separadamente das suas notas."
              />
            </label>
          </>
        ) : (
          <div
            className="file-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) void files(e.dataTransfer.files);
            }}
          >
            <Upload size={27} />
            <h3>Seus arquivos, no seu caderno.</h3>
            <p>PDF, EPUB, DOCX, texto, imagem, áudio e vídeo.</p>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Escolher arquivos
            </button>
            <small>
              Até 120 MB por arquivo. PDFs escaneados podem não ter texto
              selecionável.
            </small>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="visually-hidden"
              onChange={(e) => void files(e.target.files)}
            />
          </div>
        )}
        <label className="field">
          Tema
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            list="source-topics"
            placeholder="Organize em um tema"
          />
          <datalist id="source-topics">
            <option>Psicologia</option>
            <option>Trabalho e pesquisa</option>
            <option>Inteligência artificial</option>
            <option>Escrita</option>
          </datalist>
        </label>
        <label className="field">
          Pasta
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="Opcional, ex.: Psicologia / História"
          />
        </label>
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={readNow}
            onChange={(e) => setReadNow(e.target.checked)}
          />
          Abrir para ler ao terminar
        </label>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {mode === "file" && queue[0] && (
          <>
            <p className="form-intro">
              {queue.length} arquivo(s) na fila. Confira cada material antes de
              guardar.
            </p>
            <FileImportPanel
              key={queue[0].name + queue[0].size}
              file={queue[0]}
              existing={snapshot().sources.find(
                (s) => s.fileName === queue[0].name && s.size === queue[0].size,
              )}
              topic={topic}
              folder={folder}
              onSaved={(target) => {
                if (queue.length > 1) setQueue((q) => q.slice(1));
                else {
                  setActiveSourceId(target);
                  setTab(readNow ? "estudar" : "fontes");
                  onClose();
                }
              }}
            />
            <button
              type="button"
              className="text-button"
              onClick={() => setQueue((q) => q.slice(1))}
            >
              Retirar este arquivo da fila
            </button>
          </>
        )}
        {mode !== "file" && (
          <button className="button primary" disabled={busy}>
            {busy
              ? "Importando…"
              : readNow
                ? "Guardar e começar a ler"
                : "Guardar na biblioteca"}
            <ArrowRight size={16} />
          </button>
        )}
      </form>
    </Modal>
  );
}
