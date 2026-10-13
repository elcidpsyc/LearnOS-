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
  const [tab, setTab] = useState<"look" | "text">("look");
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
        </div>
        {tab === "look" ? (
          <>
            <label className="settings-label">Tema</label>
            <div className="theme-options">
              {[
                { id: "paper", label: "Papel" },
                { id: "sepia", label: "Sépia" },
                { id: "night", label: "Noite" },
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
          </>
        ) : (
          <>
            <label className="settings-label">Tipografia</label>
            <div className="font-options">
              <button
                className={settings.font === "serif" ? "selected" : ""}
                onClick={() => saveSettings({ font: "serif" })}
              >
                <span className="serif">Ag</span>Livro
              </button>
              <button
                className={settings.font === "sans" ? "selected" : ""}
                onClick={() => saveSettings({ font: "sans" })}
              >
                <span>Ag</span>Sans
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
                step={20}
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
