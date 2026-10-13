import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  BookOpen,
  Check,
  Headphones,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { useVault } from "@/lib/vault/store";
import { Modal, Overline } from "./ui";
export function GlossEditionModal({ onClose }: { onClose: () => void }) {
  const { sources, notes, marginNotes, settings } = useVault((s) => s);
  const [chosen, setChosen] = useState(
    sources.filter((s) => s.paragraphs.length).map((s) => s.id),
  );
  const [title, setTitle] = useState("Minha edição");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const selected = sources.filter((s) => chosen.includes(s.id));
  const pages = selected.flatMap((s) =>
    s.paragraphs.map((p) => ({ source: s, paragraph: p })),
  );
  const active = pages[page];
  const exportPDF = async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a5" });
      const width = 148,
        height = 210,
        margin = 16;
      let y = 24;
      const write = (
        text: string,
        size = 11,
        font: "normal" | "bold" | "italic" = "normal",
      ) => {
        doc.setFont("times", font);
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(text, width - margin * 2) as string[];
        for (const line of lines) {
          if (y > height - 20) {
            doc.addPage();
            y = 22;
          }
          doc.text(line, margin, y);
          y += size * 0.45;
        }
        y += 4;
      };
      write("LEARNOS / LEITURA, PENSAMENTO, MEMÓRIA", 9);
      y = 60;
      write(title, 29);
      write(settings.displayName, 14);
      write(
        new Intl.DateTimeFormat("pt-BR", {
          month: "long",
          year: "numeric",
        }).format(new Date()),
        11,
      );
      write(
        `${selected.length} fontes · ${notes.filter((n) => chosen.includes(n.fonte)).length} notas`,
        11,
      );
      doc.addPage();
      y = 24;
      write("Nesta edição", 22);
      for (const s of selected) write(`${s.title} — ${s.author}`, 12);
      for (const s of selected) {
        doc.addPage();
        y = 24;
        write(s.title, 22);
        write(
          `${s.author}${s.publishedYear ? ` · ${s.publishedYear}` : ""}`,
          11,
        );
        if (s.excerptOnly)
          write(
            "Recortes preservados; esta edição não contém a obra integral.",
            10,
            "italic",
          );
        for (const p of s.paragraphs) {
          write(`${p.page ? `p. ${p.page}` : `§ ${p.id}`}`, 8, "italic");
          write(p.text);
          for (const m of marginNotes.filter(
            (m) => m.sourceId === s.id && m.paragraphId === p.id,
          )) {
            write(
              `${m.type === "highlight" ? "Destaque" : "Na margem"}: ${m.quote ?? m.title}`,
              10,
              "italic",
            );
            if (m.content) write(m.content, 10);
          }
        }
        const ns = notes.filter((n) => n.fonte === s.id);
        if (ns.length) {
          write("Seu caderno", 18);
          for (const n of ns) {
            write(n.title, 12, "bold");
            for (const claim of n.claims) write(`Fonte: ${claim}`, 10);
            for (const comment of n.commentary)
              write(`Comentário: ${comment}`, 10);
            if (!n.claims.length && !n.commentary.length) write(n.content, 10);
            write(n.citation, 9, "italic");
          }
        }
        if (s.url) write(`Original: ${s.url}`, 9);
      }
      for (let i = 1; i <= doc.getNumberOfPages(); i++) {
        doc.setPage(i);
        doc.setFont("times", "normal");
        doc.setFontSize(8);
        doc.text(`${i}`, width / 2, height - 10, { align: "center" });
      }
      doc.save("LearnOS-minha-edicao.pdf");
      toast.success("Sua edição foi gerada em PDF.");
    } catch (e) {
      toast.error(
        "Não foi possível gerar o PDF. Tente uma seleção menor de fontes.",
      );
    } finally {
      setBusy(false);
    }
  };
  const speak = () => {
    if (playing) {
      speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    if (!("speechSynthesis" in window)) {
      toast.error("Este navegador não oferece leitura em voz alta.");
      return;
    }
    const text = selected
      .map((s) => `${s.title}. ${s.paragraphs.map((p) => p.text).join("\n")}`)
      .join("\n");
    const chunks = text.match(/.{1,900}(?:[.!?]\s|$)|.{1,900}/gs) ?? [text];
    let i = 0;
    setPlaying(true);
    const next = () => {
      if (i >= chunks.length) {
        setPlaying(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.lang = "pt-BR";
      u.onend = next;
      u.onerror = () => setPlaying(false);
      speechSynthesis.speak(u);
    };
    next();
  };
  return (
    <Modal
      title="Sua leitura, em uma edição"
      close={() => {
        if ("speechSynthesis" in window) speechSynthesis.cancel();
        onClose();
      }}
      wide
    >
      <div className="edition-layout">
        <div className="edition-preview">
          <div className="edition-spread">
            <div className="edition-left-page">
              <Overline>LEARNOS · EDIÇÃO PESSOAL</Overline>
              <div>
                <BookOpen size={58} strokeWidth={0.8} />
                <h2>{title}</h2>
                <p>{settings.displayName}</p>
              </div>
              <small>LEITURA, PENSAMENTO, MEMÓRIA.</small>
            </div>
            <div className="edition-right-page">
              {active ? (
                <>
                  <Overline>{active.source.author}</Overline>
                  <h3>{active.source.title}</h3>
                  <p>
                    {active.paragraph.text.slice(0, 740)}
                    {active.paragraph.text.length > 740 ? "…" : ""}
                  </p>
                  <small>
                    {active.paragraph.page
                      ? `p. ${active.paragraph.page}`
                      : `§ ${active.paragraph.id}`}{" "}
                    · prévia
                  </small>
                </>
              ) : (
                <p>Selecione uma fonte para preparar sua edição.</p>
              )}
            </div>
          </div>
          <div className="edition-controls">
            <button
              className="icon-button"
              aria-label="Trecho anterior"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ArrowLeft size={16} />
            </button>
            <span>
              {pages.length ? `${page + 1} / ${pages.length}` : "Sem trechos"}
            </span>
            <button
              className="icon-button"
              aria-label="Próximo trecho"
              disabled={page >= pages.length - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <aside className="edition-options">
          <Overline>SEU ACERVO, COM SUAS NOTAS</Overline>
          <h3>Um livro do que ficou.</h3>
          <p>
            Escolha as fontes. O PDF inclui o texto disponível, destaques, notas
            e referências.
          </p>
          <label className="field">
            Nome da edição
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="edition-source-list">
            {sources
              .filter((s) => s.paragraphs.length)
              .map((s) => (
                <label key={s.id}>
                  <input
                    type="checkbox"
                    checked={chosen.includes(s.id)}
                    onChange={(e) => {
                      setChosen((c) =>
                        e.target.checked
                          ? [...c, s.id]
                          : c.filter((id) => id !== s.id),
                      );
                      setPage(0);
                    }}
                  />
                  <span>
                    {s.title}
                    <small>{s.author}</small>
                  </span>
                </label>
              ))}
          </div>
          <button
            className="button primary"
            disabled={busy || !chosen.length}
            onClick={() => void exportPDF()}
          >
            <Download size={15} />
            {busy ? "Preparando…" : "Baixar edição em PDF"}
          </button>
          <button
            className="text-button"
            disabled={!chosen.length}
            onClick={speak}
          >
            {playing ? <VolumeX size={15} /> : <Headphones size={15} />}{" "}
            {playing ? "Parar áudio" : "Ouvir os textos selecionados"}
          </button>
          <small className="muted">
            A leitura em voz alta usa as vozes disponíveis no seu aparelho.
          </small>
        </aside>
      </div>
    </Modal>
  );
}
