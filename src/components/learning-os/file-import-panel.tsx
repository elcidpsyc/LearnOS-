import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw, ScanText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useVault, snapshot } from "@/lib/vault/store";
import { getFile, saveFile } from "@/lib/vault/files";
import type { Source } from "@/lib/vault/types";
import {
  readFileText,
  sourceDraft,
  type FileReadResult,
} from "@/lib/study/import";
import {
  DEFAULT_IMPORT_OPTIONS,
  type ImportOptions,
} from "@/lib/study/document-layout";
import { coverThumbnail } from "@/lib/study/epub";
import { reflowSource } from "@/lib/study/reflow";
import { Modal, Overline } from "./ui";

export function FileImportPanel({
  file,
  existing,
  topic,
  folder,
  onSaved,
}: {
  file: File;
  existing?: Source;
  topic: string;
  folder: string;
  onSaved: (id: string) => void;
}) {
  const { addSource, reorganizeSource, updateSource } = useVault((s) => s);
  const [options, setOptions] = useState<ImportOptions>(
    existing?.extraction?.options ?? DEFAULT_IMPORT_OPTIONS,
  );
  const [read, setRead] = useState<FileReadResult | null>(null);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [author, setAuthor] = useState(existing?.author ?? "");
  const [cover, setCover] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [before, setBefore] = useState(false);
  const request = useRef<AbortController | null>(null);
  const pdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  const run = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setRead(null);
    setError("");
    setPage(0);
    try {
      if (file.size > 120 * 1024 * 1024)
        throw new Error("Importe arquivos de até 120 MB.");
      const result = await readFileText(
        file,
        (m) => {
          if (!controller.signal.aborted) setMessage(m);
        },
        options,
        controller.signal,
      );
      const thumbnail = result.cover
        ? await coverThumbnail(result.cover)
        : undefined;
      if (controller.signal.aborted) return;
      setRead(result);
      setCover(thumbnail);
      setTitle(
        existing?.title ||
          result.title?.trim() ||
          file.name.replace(/\.[^.]+$/, ""),
      );
      setAuthor(
        existing?.author || result.author?.trim() || "Autor não informado",
      );
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível organizar este arquivo.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  useEffect(() => {
    void run();
    return () => request.current?.abort();
  }, [file]);
  const change = (partial: Partial<ImportOptions>) => {
    request.current?.abort();
    setBusy(false);
    setOptions((o) => ({ ...o, ...partial }));
    setRead(null);
    setError("");
  };
  const paragraphs =
    read?.paragraphs ?? sourceDraft("", read?.text ?? "").paragraphs;
  const stats =
    read && existing && paragraphs.length
      ? reflowSource(snapshot(), existing.id, read).stats
      : null;
  const save = async () => {
    if (!read || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      let target: string;
      if (existing) {
        reorganizeSource(existing.id, read);
        updateSource(existing.id, {
          ...(cover ? { coverImage: cover } : {}),
          ...(read.language ? { language: read.language } : {}),
          title: title.trim(),
          author: author.trim() || "Autor não informado",
        });
        target = existing.id;
      } else {
        const fileId = crypto.randomUUID();
        await saveFile(fileId, file);
        target = addSource({
          ...sourceDraft(
            title.trim(),
            read.text,
            author.trim() || "Autor não informado",
            topic,
          ),
          paragraphs,
          pages: read.pages,
          format: read.format,
          origin: "file",
          fileId,
          fileName: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          folder: folder.trim(),
          extraction: read.report,
          coverImage: cover,
          language: read.language,
          publishedYear: read.publishedYear ?? "",
        });
      }
      toast.success(
        existing
          ? "Texto reorganizado. Caderno preservado."
          : "Material guardado na biblioteca.",
      );
      onSaved(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };
  const shown = before && existing ? existing.paragraphs : paragraphs;
  const pageCount = Math.max(1, Math.ceil(shown.length / 12));
  return (
    <div className="file-import-panel form-stack">
      <div className="import-file-heading">
        <ScanText size={22} />
        <div>
          <strong>{file.name}</strong>
          <small>
            {existing
              ? "Reorganizar o texto deste material"
              : "Prévia antes de guardar"}{" "}
            · {(file.size / 1024 / 1024).toFixed(1)} MB
          </small>
        </div>
      </div>
      {pdf && (
        <fieldset className="import-options">
          <legend>Como organizar o PDF</legend>
          <label className="field">
            Colunas
            <select
              value={options.columns}
              disabled={busy}
              onChange={(e) =>
                change({ columns: e.target.value as ImportOptions["columns"] })
              }
            >
              <option value="auto">Detectar automaticamente</option>
              <option value="single">Uma coluna</option>
              <option value="double">Duas colunas</option>
            </select>
          </label>
          {(
            [
              { key: "joinLines", label: "Unir linhas em parágrafos" },
              {
                key: "removeHeaders",
                label: "Remover cabeçalhos e números repetidos",
              },
              {
                key: "joinHyphens",
                label: "Recompor palavras partidas no fim da linha",
              },
            ] as const
          ).map((o) => (
            <label className="toggle-field" key={o.key}>
              <input
                type="checkbox"
                checked={options[o.key]}
                disabled={busy}
                onChange={(e) => change({ [o.key]: e.target.checked })}
              />
              {o.label}
            </label>
          ))}
          <small>
            Confira nomes e palavras compostas. A organização usa a camada de
            texto do PDF; a grafia original não é corrigida automaticamente.
          </small>
        </fieldset>
      )}
      {busy ? (
        <p role="status" className="import-progress">
          {message || "Preparando arquivo…"}
        </p>
      ) : (
        !read && (
          <button type="button" className="button" onClick={() => void run()}>
            <RefreshCw size={15} />
            Gerar prévia
          </button>
        )
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {read && (
        <>
          <div className="field-row">
            <label className="field">
              Título
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="field">
              Autor
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </label>
          </div>
          <div className="extraction-summary">
            <span>{paragraphs.length} parágrafos</span>
            {read.pages > 0 && <span>{read.pages} páginas</span>}
            {read.report && (
              <>
                <span>{read.report.chapterCount} títulos</span>
                {pdf && (
                  <span>
                    {read.report.removedHeaders} cabeçalhos removidos ·{" "}
                    {read.report.columnPages} páginas em duas colunas
                  </span>
                )}
              </>
            )}
          </div>
          {read.report?.warnings.map((w) => (
            <p className="import-warning" key={w}>
              {w}
            </p>
          ))}
          {existing && (
            <div className="reflow-summary">
              <strong>Seu caderno continua neste material.</strong>
              <p>
                {stats?.verified ?? 0} referências localizadas ·{" "}
                {stats?.unmatched ?? 0} para conferir no caderno. Referências
                não localizadas ficam identificadas como “trecho da versão
                anterior”, com seu conteúdo preservado.
              </p>
              <div className="segmented">
                <button
                  type="button"
                  className={!before ? "active" : ""}
                  onClick={() => {
                    setBefore(false);
                    setPage(0);
                  }}
                >
                  Nova organização
                </button>
                <button
                  type="button"
                  className={before ? "active" : ""}
                  onClick={() => {
                    setBefore(true);
                    setPage(0);
                  }}
                >
                  Texto atual
                </button>
              </div>
            </div>
          )}
          {!!shown.length && (
            <section
              className="import-preview"
              aria-label={before ? "Texto atual" : "Prévia do texto organizado"}
            >
              {shown.slice(page * 12, page * 12 + 12).map((p) => (
                <div key={p.id}>
                  <small>
                    {p.page
                      ? `Página ${p.page}${p.pageEnd ? `–${p.pageEnd}` : ""}`
                      : p.section || `¶${p.id}`}
                  </small>
                  {p.kind === "heading" ? (
                    <h3>{p.text}</h3>
                  ) : (
                    <p className={p.kind === "quote" ? "preview-quote" : ""}>
                      {p.text}
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}
          {!!shown.length && (
            <div className="preview-pagination">
              <button
                type="button"
                className="text-button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>
                Trechos {page * 12 + 1}–
                {Math.min((page + 1) * 12, shown.length)} de {shown.length}
              </span>
              <button
                type="button"
                className="text-button"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Próximos
              </button>
            </div>
          )}
          {!paragraphs.length && (
            <p className="form-intro">
              O arquivo será guardado para consulta no formato original. Não há
              texto disponível para o leitor.
            </p>
          )}
          <button
            type="button"
            className="button primary"
            disabled={
              busy || !title.trim() || (!!existing && !paragraphs.length)
            }
            onClick={() => void save()}
          >
            {existing ? <Check size={16} /> : <ArrowRight size={16} />}{" "}
            {existing ? "Aplicar nova organização" : "Guardar este material"}
          </button>
        </>
      )}
    </div>
  );
}

export function ReorganizeSourceModal({
  source,
  close,
}: {
  source: Source;
  close: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const blob = source.fileId && (await getFile(source.fileId));
        if (!blob)
          throw new Error(
            "O arquivo original não está disponível neste aparelho. Importe o arquivo novamente para reorganizar este material.",
          );
        if (live)
          setFile(
            new File(
              [blob],
              source.fileName ?? `material.${source.format.toLowerCase()}`,
              { type: source.mime ?? blob.type },
            ),
          );
      } catch (e) {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível abrir o original.",
          );
      }
    })();
    return () => {
      live = false;
    };
  }, [source.fileId]);
  return (
    <Modal
      title="Organizar texto do material"
      close={close}
      wide
      className="import-modal"
    >
      <p className="form-intro">
        Confira a nova leitura antes de aplicar. O arquivo original é
        preservado.
      </p>
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : file ? (
        <FileImportPanel
          file={file}
          existing={source}
          topic={source.topic}
          folder={source.folder ?? ""}
          onSaved={close}
        />
      ) : (
        <p role="status">Abrindo arquivo original…</p>
      )}
    </Modal>
  );
}
