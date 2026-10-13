import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Cloud,
  Copy,
  RefreshCw,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { snapshot, useVault } from "@/lib/vault/store";
import { createBackup, readBackup } from "@/lib/vault/files";
import type { VaultData } from "@/lib/vault/types";
import { Modal, Overline } from "./ui";
export function WorkspaceSettings() {
  const {
    settings,
    saveSettings,
    setSettingsOpen,
    cloudStatus,
    cloudError,
    connectCloud,
    disconnectCloud,
    syncCloud,
    replaceVault,
  } = useVault((s) => s);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState<{
    data: VaultData;
    restore: () => Promise<void>;
  } | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível concluir.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Meu espaço" close={() => setSettingsOpen(false)}>
      <div className="settings-stack">
        <label className="field">
          Nome da biblioteca
          <input
            value={settings.displayName}
            onChange={(e) => saveSettings({ displayName: e.target.value })}
          />
        </label>
        <section>
          <Overline>MEMÓRIA E ARQUIVOS</Overline>
          <h3>Leve seu caderno com você.</h3>
          <p>
            O backup reúne fontes, notas, destaques, respostas de revisão e os
            arquivos disponíveis neste aparelho.
          </p>
          <div className="button-row">
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const missing = await createBackup(snapshot());
                  toast.success(
                    missing.length
                      ? `Backup criado; ${missing.length} arquivo(s) não estavam neste aparelho.`
                      : "Backup completo criado.",
                  );
                })
              }
            >
              <Download size={15} />
              Baixar backup
            </button>
            <button
              className="button subtle"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={15} />
              Restaurar
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,.json"
            className="visually-hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(async () => setPending(await readBackup(f)));
              e.target.value = "";
            }}
          />
          {pending && (
            <div className="restore-preview">
              <strong>
                {pending.data.notes.length} notas ·{" "}
                {pending.data.sources.length} fontes
              </strong>
              <p>
                Restaurar substitui o caderno neste aparelho. Faça um backup do
                conteúdo atual antes de continuar.
              </p>
              <div className="button-row">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await pending.restore();
                      replaceVault(pending.data);
                      setPending(null);
                      toast.success("Caderno restaurado.");
                    })
                  }
                >
                  Restaurar este backup
                </button>
                <button
                  className="button subtle"
                  onClick={() => setPending(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
        <section>
          <Overline>ESPAÇO PRIVADO</Overline>
          <h3>Celular, tablet e seus agentes.</h3>
          <p>
            Uma chave privada conecta seus aparelhos ao mesmo caderno. Guarde a
            chave; ela permite acessar e modificar o espaço.
          </p>
          {settings.cloudEnabled ? (
            <>
              <div className="cloud-status">
                <ShieldCheck size={16} />
                {cloudStatus === "synced"
                  ? "Sincronizado"
                  : cloudStatus === "saving"
                    ? "Sincronizando…"
                    : cloudStatus === "error"
                      ? "Sincronização pendente"
                      : "Conectado"}
              </div>
              {cloudError && <p className="inline-error">{cloudError}</p>}
              <div className="secret-field">
                <input
                  readOnly
                  type={show ? "text" : "password"}
                  value={settings.cloudToken}
                  aria-label="Chave privada do espaço"
                />
                <button
                  className="icon-button"
                  aria-label={show ? "Ocultar chave" : "Mostrar chave"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  className="icon-button"
                  aria-label="Copiar chave privada"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(settings.cloudToken)
                      .then(() => toast.success("Chave copiada."))
                  }
                >
                  <Copy size={16} />
                </button>
              </div>
              <div className="button-row">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void run(syncCloud)}
                >
                  <RefreshCw size={15} />
                  Sincronizar agora
                </button>
                <button className="text-button" onClick={disconnectCloud}>
                  Usar só neste aparelho
                </button>
              </div>
              <div className="mcp-instructions">
                <strong>Conectar Claude, ChatGPT ou Grok</strong>
                <p>
                  Adicione um servidor MCP com este endereço e use a chave
                  privada no cabeçalho Authorization, no formato Bearer seguido
                  da chave.
                </p>
                <code>{location.origin}/api/mcp</code>
                <p>
                  O agente pode consultar e adicionar fontes, ler notas e
                  registrar notas citadas. Toque em sincronizar para receber
                  suas alterações.
                </p>
              </div>
            </>
          ) : (
            <>
              <label className="field">
                Chave de outro aparelho <span className="muted">Opcional</span>
                <input
                  autoComplete="off"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Cole sua chave privada para conectar"
                />
              </label>
              <button
                className="button"
                disabled={busy}
                onClick={() => void run(() => connectCloud(token))}
              >
                <Cloud size={15} />
                {busy
                  ? "Conectando…"
                  : token
                    ? "Conectar meu espaço"
                    : "Criar espaço privado"}
              </button>
              {cloudError && <p className="inline-error">{cloudError}</p>}
            </>
          )}
        </section>
        <section>
          <Overline>ASSISTENTE</Overline>
          <label className="field">
            Modelo de leitura
            <select
              value={settings.model}
              onChange={(e) =>
                saveSettings({ model: e.target.value as typeof settings.model })
              }
            >
              <option value="openai">OpenAI · GPT</option>
              <option value="anthropic">Anthropic · Claude</option>
              <option value="grok">xAI · Grok</option>
            </select>
          </label>
          <p>
            A IA usa somente o contexto enviado quando você pede uma resposta. O
            acervo local funciona sem IA.
          </p>
        </section>
      </div>
    </Modal>
  );
}
