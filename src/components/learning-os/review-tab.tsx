import { useState } from "react";
import {
  ArrowRight,
  RotateCcw,
  Check,
  Plus,
  BookOpen,
  Trash2,
} from "lucide-react";
import { useVault } from "@/lib/vault/store";
import { isDue, localDay, reviewInterval } from "@/lib/vault/model";
import { Empty, Overline, Modal } from "./ui";
export function ReviewTab() {
  const {
    cards,
    sources,
    reviews,
    reviewCard,
    addCard,
    deleteCard,
    setActiveSourceId,
    setTab,
  } = useVault((s) => s);
  const [queue, setQueue] = useState(() =>
    cards
      .filter((c) => isDue(c))
      .sort((a, b) => a.proxima.localeCompare(b.proxima))
      .map((c) => c.id),
  );
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deck, setDeck] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const current = cards.find((c) => c.id === queue[index]);
  const completed = index >= queue.length;
  const reset = () => {
    setQueue(
      cards
        .filter((c) => isDue(c))
        .sort((a, b) => a.proxima.localeCompare(b.proxima))
        .map((c) => c.id),
    );
    setIndex(0);
    setAnswer("");
    setRevealed(false);
  };
  const rate = (rating: number) => {
    if (!current) return;
    reviewCard(current.id, rating, answer);
    setIndex((i) => i + 1);
    setAnswer("");
    setRevealed(false);
  };
  return (
    <div className="review-page">
      <div className="page-heading">
        <div>
          <Overline>LEMBRAR TAMBÉM É APRENDER</Overline>
          <h1>
            Uma ideia de cada vez<span className="title-period">.</span>
          </h1>
          <p>Responda de memória. Depois, volte à fonte.</p>
        </div>
        <div className="heading-actions">
          <button className="button subtle" onClick={() => setDeck(true)}>
            Meus cartões
          </button>
          <button className="button" onClick={() => setAdding(true)}>
            <Plus size={15} />
            Novo cartão
          </button>
        </div>
      </div>
      {completed ? (
        <div className="review-complete">
          <div className="review-complete-icon">
            <Check size={28} strokeWidth={1.2} />
          </div>
          <Overline>
            {queue.length ? "SESSÃO CONCLUÍDA" : "SEM REVISÕES PARA HOJE"}
          </Overline>
          <h2>
            {queue.length
              ? "Uma ideia mais perto."
              : "Sua memória tem seu tempo."}
          </h2>
          <p>
            {queue.length
              ? `${queue.length} cartões percorridos. Suas respostas e os próximos intervalos estão guardados.`
              : "Os cartões voltam na data marcada, inclusive aqueles que você já achou fáceis."}
          </p>
          <button className="button" onClick={reset}>
            <RotateCcw size={15} />
            Atualizar fila
          </button>
          <button
            className="text-button"
            onClick={() => {
              setQueue(cards.map((c) => c.id));
              setIndex(0);
              setAnswer("");
              setRevealed(false);
            }}
          >
            Praticar todos os cartões
            <ArrowRight size={14} />
          </button>
        </div>
      ) : current ? (
        <div className="review-studio">
          <div className="review-session-meta">
            <span>
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(queue.length).padStart(2, "0")}
            </span>
            <span>
              {sources.find((s) => s.id === current.fonte)?.author} ·{" "}
              {current.location || "Notas salvas"}
            </span>
          </div>
          <article className="review-card">
            <Overline>
              {revealed ? "SUA RESPOSTA E A FONTE" : "LEMBRE ANTES DE CONFERIR"}
            </Overline>
            <h2>{current.frente}</h2>
            {!revealed ? (
              <>
                <label className="field review-answer">
                  <span className="visually-hidden">Sua resposta</span>
                  <textarea
                    rows={5}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="O que você lembra, sem consultar as notas?"
                  />
                </label>
                <button
                  className="button primary"
                  disabled={!answer.trim()}
                  onClick={() => setRevealed(true)}
                >
                  Conferir com a fonte
                  <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="learner-answer">
                  <Overline>VOCÊ ESCREVEU</Overline>
                  <p>{answer}</p>
                </div>
                <div className="source-answer">
                  <Overline>A NOTA REGISTRA</Overline>
                  <p>{current.verso}</p>
                </div>
                <div className="review-ratings">
                  {[
                    { rating: 1, label: "Ainda difícil" },
                    { rating: 2, label: "Com esforço" },
                    { rating: 3, label: "Lembrei" },
                    { rating: 5, label: "Fácil" },
                  ].map((r) => (
                    <button key={r.rating} onClick={() => rate(r.rating)}>
                      <strong>{r.label}</strong>
                      <small>{reviewInterval(current, r.rating)} dias</small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </article>
          <div className="review-footer">
            <button
              className="text-button"
              onClick={() => {
                setActiveSourceId(current.fonte);
                setTab("estudar");
              }}
            >
              <BookOpen size={14} />
              Consultar fonte
            </button>
            <button
              className="text-button"
              onClick={() => {
                setIndex((i) => i + 1);
                setAnswer("");
                setRevealed(false);
              }}
            >
              Pular por enquanto
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <Empty
          title="Este cartão foi removido."
          text="Atualize a fila para continuar."
          action={
            <button className="button" onClick={reset}>
              Atualizar fila
            </button>
          }
        />
      )}
      <div className="review-history-note">
        {reviews.length} respostas guardadas · {cards.length} cartões no caderno
      </div>
      {adding && (
        <Modal title="Criar cartão" close={() => setAdding(false)}>
          <div className="form-stack">
            <label className="field">
              Pergunta
              <textarea
                autoFocus
                rows={3}
                value={front}
                onChange={(e) => setFront(e.target.value)}
              />
            </label>
            <label className="field">
              Resposta da fonte
              <textarea
                rows={4}
                value={back}
                onChange={(e) => setBack(e.target.value)}
              />
            </label>
            <label className="field">
              Fonte
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button primary"
              disabled={!front.trim() || !back.trim() || !sourceId}
              onClick={() => {
                const target = addCard({
                  frente: front.trim(),
                  verso: back.trim(),
                  fonte: sourceId,
                  tags: [
                    sources.find((s) => s.id === sourceId)?.topic ?? "Estudo",
                  ],
                  proxima: localDay(),
                  qualidade: 1,
                  revisoes: 0,
                });
                setQueue((q) => [...q, target]);
                setAdding(false);
                setFront("");
                setBack("");
              }}
            >
              Guardar cartão
              <Check size={15} />
            </button>
          </div>
        </Modal>
      )}
      {deck && (
        <Modal title="Seus cartões" close={() => setDeck(false)} wide>
          <div className="deck-list">
            {cards.map((c) => (
              <div key={c.id}>
                <strong>{c.frente}</strong>
                <small>
                  Rever em {c.proxima.split("-").reverse().join("/")} ·{" "}
                  {c.revisoes} revisões
                </small>
                <button
                  className="icon-button"
                  aria-label="Remover cartão"
                  onClick={() => {
                    if (confirm("Remover este cartão?")) deleteCard(c.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
