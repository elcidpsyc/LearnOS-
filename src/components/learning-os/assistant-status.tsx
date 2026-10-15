import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { assist, getAiStatus, type AiStatus } from "@/lib/study/ai";
import { useVault } from "@/lib/vault/store";
export function AssistantStatus() {
  const settings = useVault((s) => s.settings);
  const [status, setStatus] = useState<AiStatus | null>(null),
    [busy, setBusy] = useState(false),
    [answer, setAnswer] = useState(""),
    [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    void getAiStatus().then((value) => {
      if (active) setStatus(value);
    });
    return () => {
      active = false;
      request.current?.abort();
    };
  }, []);
  const connected = /^[a-f0-9]{64}$/.test(settings.cloudToken);
  const check = async () => {
    setBusy(true);
    setAnswer("");
    setError("");
    request.current?.abort();
    request.current = new AbortController();
    try {
      const result = await assist(
        "ask",
        "Qual é o objetivo do LearnOS? Responda em uma frase.",
        "[¶1] O LearnOS ajuda a organizar materiais de estudo, fazer anotações e praticar o conhecimento.",
        "Teste de conexão do LearnOS",
        { signal: request.current.signal, depth: "quick" },
      );
      if (!request.current.signal.aborted) setAnswer(result.answer);
    } catch (e) {
      if (!request.current.signal.aborted)
        setError(e instanceof Error ? e.message : "A conexão não respondeu.");
    } finally {
      if (!request.current.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="assistant-diagnostics">
      <div>
        <span>Espaço pessoal</span>
        <strong>{connected ? "Conectado" : "Conecte na seção acima"}</strong>
      </div>
      <div>
        <span>Serviço de IA</span>
        <strong>
          {status
            ? status.available
              ? "Configuração encontrada"
              : "Configuração pendente"
            : "Conferindo…"}
        </strong>
      </div>
      <div>
        <span>Pesquisa na Web</span>
        <strong>
          {status
            ? status.webSearch
              ? "Configurada"
              : "Ainda não configurada"
            : "Conferindo…"}
        </strong>
      </div>
      <p>
        O teste envia apenas uma frase de exemplo. Uma resposta confirma o
        acesso ao modelo escolhido.
      </p>
      <button
        type="button"
        className="button subtle"
        disabled={busy || !connected || !status?.available}
        onClick={() => void check()}
      >
        <RefreshCw size={14} />
        {busy ? "Testando…" : "Testar assistente"}
      </button>
      {answer && (
        <p className="assistant-test-answer" role="status">
          {answer}
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
