import { useVault } from "@/lib/vault/store";
import { ArrowUpRight } from "lucide-react";
import { WORKSPACE_REQUIRED_MESSAGE } from "@/lib/study/ai";
export function AssistantAccess({ error }: { error: string }) {
  const { settings, setSettingsOpen } = useVault((s) => s);
  const connected = /^[a-f0-9]{64}$/.test(settings.cloudToken);
  const needsConnection = error === WORKSPACE_REQUIRED_MESSAGE;
  return (
    <div
      className={`assistant-access ${needsConnection ? "" : "assistant-failed"}`}
      role={needsConnection ? "status" : "alert"}
    >
      <strong>
        {needsConnection
          ? "Conecte seu assistente"
          : "O assistente precisa de atenção"}
      </strong>
      <p>
        {needsConnection
          ? "Abra Meu espaço para conectar a IA. Sua seleção e sua pergunta continuam aqui."
          : error}
      </p>
      <button
        type="button"
        className="text-button"
        onClick={() => setSettingsOpen(true)}
      >
        {connected ? "Ver conexão" : "Configurar assistente"}
        <ArrowUpRight size={13} />
      </button>
    </div>
  );
}
