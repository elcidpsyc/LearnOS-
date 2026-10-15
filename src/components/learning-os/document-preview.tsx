import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pencil, Check, Undo2 } from "lucide-react";
import type { Paragraph } from "@/lib/vault/types";
import {
  editPreview,
  previewSheets,
  sheetForPage,
} from "@/lib/study/document-preview";

export function DocumentPreview({
  paragraphs,
  file,
  readOnly = false,
  onChange,
  onEditing,
}: {
  paragraphs: Paragraph[];
  file: File;
  readOnly?: boolean;
  onChange: (paragraphs: Paragraph[]) => void;
  onEditing: (editing: boolean) => void;
}) {
  const sheets = useMemo(() => previewSheets(paragraphs), [paragraphs]);
  const [index, setIndex] = useState(0),
    [jump, setJump] = useState("");
  const [editing, setEditing] = useState<number | null>(null),
    [draft, setDraft] = useState("");
  const [kind, setKind] = useState<Paragraph["kind"]>("paragraph");
  const [original, setOriginal] = useState("");
  const [jumpNotice, setJumpNotice] = useState("");
  const currentIndex = Math.min(index, Math.max(0, sheets.length - 1));
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setOriginal(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => onEditing(false), []);
  const sheet = sheets[currentIndex];
  const label = sheet?.page
    ? sheet.lastPage !== sheet.page
      ? `Páginas ${sheet.page}–${sheet.lastPage}`
      : `Página ${sheet.page}`
    : sheet?.label;
  const move = (next: number) => {
    setJumpNotice("");
    setIndex(next);
    setEditing(null);
    onEditing(false);
    section.current?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  const go = () => {
    const n = Number(jump);
    if (Number.isInteger(n) && n > 0) {
      const target = sheetForPage(sheets, n);
      move(target);
      const selected = sheets[target];
      if (
        selected?.page !== undefined &&
        !(selected.page <= n && (selected.lastPage ?? selected.page) >= n)
      )
        setJumpNotice(
          `A página ${n} não tem um bloco nesta prévia. Mostrando a página ${selected.page}.`,
        );
      setJump("");
    }
  };
  const start = (p: Paragraph) => {
    setEditing(p.id);
    setDraft(p.text);
    setKind(p.kind ?? "paragraph");
    onEditing(true);
  };
  const finish = () => {
    setEditing(null);
    onEditing(false);
  };
  if (!sheet) return null;
  return (
    <section
      className="document-preview"
      ref={section}
      aria-label={readOnly ? "Texto atual" : "Prévia do texto organizado"}
    >
      <header className="preview-sheet-heading">
        <div>
          <small>{readOnly ? "TEXTO ATUAL" : "CONFERÊNCIA DE LEITURA"}</small>
          <strong>{label}</strong>
        </div>
        <div className="preview-jump">
          {sheet.page ? (
            <>
              <label>
                Ir para página
                <input
                  aria-label="Ir para página"
                  inputMode="numeric"
                  type="number"
                  min="1"
                  value={jump}
                  onChange={(e) => setJump(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      go();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="text-button"
                onClick={go}
                disabled={!jump}
              >
                Ir
              </button>
            </>
          ) : (
            <label>
              Seção
              <select
                aria-label="Seção da prévia"
                value={Math.min(index, sheets.length - 1)}
                onChange={(e) => move(Number(e.target.value))}
              >
                {sheets.map((s, i) => (
                  <option key={i} value={i}>
                    {i + 1}. {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {original && (
            <a
              className="text-button"
              href={`${original}${sheet.page ? `#page=${sheet.page}` : ""}`}
              target={sheet.page ? "_blank" : undefined}
              download={sheet.page ? undefined : file.name}
              rel="noopener noreferrer"
            >
              {sheet.page ? "Ver original ↗" : "Baixar original"}
            </a>
          )}
        </div>
      </header>
      {jumpNotice && (
        <p className="preview-jump-notice" role="status">
          {jumpNotice}
        </p>
      )}
      <div className="preview-page-body">
        {sheet.paragraphs.map((p) => {
          const at = paragraphs.findIndex((item) => item.id === p.id),
            next = paragraphs[at + 1];
          const canMerge =
            next && p.page === next.page && p.section === next.section;
          return (
            <div
              className={`preview-block preview-${p.kind ?? "paragraph"}`}
              key={p.id}
            >
              {editing === p.id ? (
                <div className="preview-block-editor">
                  <label className="field">
                    Corrigir trecho
                    <textarea
                      autoFocus
                      rows={Math.min(
                        12,
                        Math.max(3, Math.ceil(draft.length / 80)),
                      )}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Apresentar como
                    <select
                      value={kind}
                      onChange={(e) =>
                        setKind(e.target.value as Paragraph["kind"])
                      }
                    >
                      <option value="paragraph">Parágrafo</option>
                      <option value="heading">Título</option>
                      <option value="quote">Citação</option>
                      <option value="list">Item de lista</option>
                      <option value="code">Código</option>
                      <option value="table">Tabela</option>
                    </select>
                  </label>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button"
                      disabled={!draft.trim()}
                      onClick={() => {
                        onChange(
                          editPreview(paragraphs, p.id, {
                            type: "replace",
                            text: draft,
                            kind,
                          }),
                        );
                        finish();
                      }}
                    >
                      <Check size={14} />
                      Aplicar correção
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={finish}
                    >
                      <Undo2 size={13} />
                      Cancelar
                    </button>
                    {canMerge && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          onChange(
                            editPreview(paragraphs, p.id, { type: "merge" }),
                          );
                          finish();
                        }}
                      >
                        Unir ao próximo
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        onChange(
                          editPreview(paragraphs, p.id, { type: "omit" }),
                        );
                        finish();
                      }}
                    >
                      Ignorar este bloco
                    </button>
                  </div>
                  <small>
                    As mudanças valem para a leitura organizada. O arquivo
                    original permanece intacto.
                  </small>
                </div>
              ) : (
                <>
                  {p.kind === "heading" ? (
                    <h3>{p.text}</h3>
                  ) : p.kind === "code" || p.kind === "table" ? (
                    <pre>{p.text}</pre>
                  ) : p.kind === "quote" ? (
                    <blockquote>{p.text}</blockquote>
                  ) : (
                    <p>
                      {p.kind === "list" ? "• " : ""}
                      {p.text}
                    </p>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      className="preview-edit"
                      aria-label={`Editar trecho ${p.id}`}
                      title="Corrigir ou unir este trecho"
                      onClick={() => start(p)}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <footer className="preview-pagination">
        <button
          type="button"
          className="text-button"
          disabled={currentIndex === 0 || editing !== null}
          onClick={() => move(Math.max(0, currentIndex - 1))}
        >
          <ArrowLeft size={13} />
          Anterior
        </button>
        <span>
          {sheet.page ? label : `Seção ${currentIndex + 1} de ${sheets.length}`}
          <small>{sheet.paragraphs.length} blocos nesta prévia</small>
        </span>
        <button
          type="button"
          className="text-button"
          disabled={currentIndex + 1 >= sheets.length || editing !== null}
          onClick={() => move(currentIndex + 1)}
        >
          Próxima
          <ArrowRight size={13} />
        </button>
      </footer>
    </section>
  );
}
