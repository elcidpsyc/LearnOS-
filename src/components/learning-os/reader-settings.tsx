import { useState } from "react";
import {
  X,
  Minus,
  Plus,
  RotateCcw,
  AlignLeft,
  AlignJustify,
} from "lucide-react";
import { useVault } from "@/lib/vault/store";
import { DEFAULT_SETTINGS } from "@/lib/vault/model";
import { Modal } from "./ui";
export function ReaderSettings({ close }: { close: () => void }) {
  const { settings, saveSettings } = useVault((s) => s);
  const [tab, setTab] = useState<"look" | "text" | "answers">("look");
  return (
    <Modal title="Do seu jeito" close={close}>
      <div className="reader-preferences">
        <div className="segmented">
          <button
            className={tab === "look" ? "active" : ""}
            onClick={() => setTab("look")}
          >
            Aparência
          </button>
          <button
            className={tab === "text" ? "active" : ""}
            onClick={() => setTab("text")}
          >
            Texto
          </button>
          <button
            className={tab === "answers" ? "active" : ""}
            onClick={() => setTab("answers")}
          >
            Respostas
          </button>
        </div>
        {tab === "look" ? (
          <>
            <label className="settings-label">Tema</label>
            <div className="theme-options">
              {[
                { id: "auto", label: "Sistema" },
                { id: "paper", label: "Papel" },
                { id: "sepia", label: "Sépia" },
                { id: "snow", label: "Neve" },
                { id: "night", label: "Noite" },
                { id: "ink", label: "Tinta" },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`theme-swatch ${t.id} ${settings.theme === t.id ? "selected" : ""}`}
                  onClick={() =>
                    saveSettings({ theme: t.id as typeof settings.theme })
                  }
                >
                  <span>Aa</span>
                  <small>{t.label}</small>
                </button>
              ))}
            </div>
            <div className="color-row">
              <span>Tinta</span>
              <div>
                {["#a84939", "#416b95", "#557856", "#3d3935"].map((c) => (
                  <button
                    key={c}
                    aria-label={`Tinta ${c}`}
                    className={settings.penColor === c ? "selected" : ""}
                    style={{ background: c }}
                    onClick={() => saveSettings({ penColor: c })}
                  />
                ))}
              </div>
            </div>
            <div className="color-row">
              <span>Marca-texto</span>
              <div>
                {["#efcf69", "#aac993", "#a1c8da", "#dba0b4"].map((c) => (
                  <button
                    key={c}
                    aria-label={`Marca-texto ${c}`}
                    className={settings.highlightColor === c ? "selected" : ""}
                    style={{ background: c }}
                    onClick={() => saveSettings({ highlightColor: c })}
                  />
                ))}
              </div>
            </div>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={settings.numbers}
                onChange={(e) => saveSettings({ numbers: e.target.checked })}
              />
              Números de parágrafo
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={settings.minimap}
                onChange={(e) => saveSettings({ minimap: e.target.checked })}
              />
              Mapa do documento
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={settings.focus}
                onChange={(e) => saveSettings({ focus: e.target.checked })}
              />
              Modo foco
            </label>
            <label className="range-setting">
              <span>
                Velocidade da voz <b>{settings.speechRate.toFixed(1)}×</b>
              </span>
              <input
                aria-label="Velocidade da voz"
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={settings.speechRate}
                onChange={(e) =>
                  saveSettings({ speechRate: Number(e.target.value) })
                }
              />
            </label>
          </>
        ) : tab === "text" ? (
          <>
            <label className="settings-label">Tipografia</label>
            <div className="font-options">
              <button
                className={settings.font === "serif" ? "selected" : ""}
                onClick={() => saveSettings({ font: "serif" })}
              >
                <span className="serif">Ag</span>Editorial
              </button>
              <button
                className={settings.font === "book" ? "selected" : ""}
                onClick={() => saveSettings({ font: "book" })}
              >
                <span style={{ fontFamily: "'Literata Variable', serif" }}>
                  Ag
                </span>
                Livro
              </button>
              <button
                className={settings.font === "sans" ? "selected" : ""}
                onClick={() => saveSettings({ font: "sans" })}
              >
                <span>Ag</span>Sans
              </button>
              <button
                className={settings.font === "legible" ? "selected" : ""}
                onClick={() => saveSettings({ font: "legible" })}
              >
                <span
                  style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}
                >
                  Ag
                </span>
                Legível
              </button>
            </div>
            <label className="range-setting">
              <span>
                Tamanho <b>{settings.fontSize}</b>
              </span>
              <input
                aria-label="Tamanho do texto"
                type="range"
                min={14}
                max={28}
                value={settings.fontSize}
                onChange={(e) =>
                  saveSettings({ fontSize: Number(e.target.value) })
                }
              />
            </label>
            <label className="range-setting">
              <span>
                Entrelinha <b>{settings.lineHeight.toFixed(2)}</b>
              </span>
              <input
                aria-label="Entrelinha"
                type="range"
                min={1.3}
                max={2.4}
                step={0.05}
                value={settings.lineHeight}
                onChange={(e) =>
                  saveSettings({ lineHeight: Number(e.target.value) })
                }
              />
            </label>
            <label className="range-setting">
              <span>
                Largura <b>{settings.width}</b>
              </span>
              <input
                aria-label="Largura da leitura"
                type="range"
                min={440}
                max={820}
                step={10}
                value={settings.width}
                onChange={(e) =>
                  saveSettings({ width: Number(e.target.value) })
                }
              />
            </label>
            <div className="segmented">
              <button
                className={settings.align === "left" ? "active" : ""}
                onClick={() => saveSettings({ align: "left" })}
              >
                <AlignLeft size={15} />À esquerda
              </button>
              <button
                className={settings.align === "justify" ? "active" : ""}
                onClick={() => saveSettings({ align: "justify" })}
              >
                <AlignJustify size={15} />
                Justificado
              </button>
            </div>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={settings.indent}
                onChange={(e) => saveSettings({ indent: e.target.checked })}
              />
              Recuo no início dos parágrafos
            </label>
          </>
        ) : (
          <div className="form-stack">
            <label className="field">
              Extensão da resposta
              <select
                value={settings.answerLength}
                onChange={(e) =>
                  saveSettings({
                    answerLength: e.target
                      .value as typeof settings.answerLength,
                  })
                }
              >
                <option value="short">Curta</option>
                <option value="balanced">Equilibrada</option>
                <option value="detailed">Detalhada</option>
              </select>
            </label>
            <label className="field">
              Profundidade padrão
              <select
                value={settings.answerDepth}
                onChange={(e) =>
                  saveSettings({
                    answerDepth: e.target.value as typeof settings.answerDepth,
                  })
                }
              >
                <option value="quick">Rápida</option>
                <option value="deep">Aprofundada</option>
              </select>
            </label>
            <label className="field">
              Assistente
              <select
                value={settings.model}
                onChange={(e) =>
                  saveSettings({
                    model: e.target.value as typeof settings.model,
                  })
                }
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Claude</option>
                <option value="grok">Grok</option>
              </select>
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={settings.webSearch}
                onChange={(e) => saveSettings({ webSearch: e.target.checked })}
              />
              Consultar a web nas perguntas
            </label>
            <p className="form-intro">
              A pesquisa consulta fontes externas quando conectada. A tradução
              continua sendo feita somente quando você pedir.
            </p>
          </div>
        )}
        <button
          className="text-button"
          onClick={() =>
            saveSettings({
              ...DEFAULT_SETTINGS,
              displayName: settings.displayName,
              cloudEnabled: settings.cloudEnabled,
              cloudToken: settings.cloudToken,
              model: settings.model,
              answerLength: settings.answerLength,
              answerDepth: settings.answerDepth,
              webSearch: settings.webSearch,
            })
          }
        >
          <RotateCcw size={14} />
          Restaurar aparência
        </button>
      </div>
    </Modal>
  );
}
