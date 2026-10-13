import { snapshot } from "../vault/store";
export type AiStatus = {
  available: boolean;
  storage: boolean;
  models: { id: string; label: string }[];
  message?: string;
};
export type AssistMode =
  | "ask"
  | "translate"
  | "explain"
  | "distill"
  | "socratic"
  | "compare"
  | "flashcard"
  | "summary";
export type AssistResult = {
  answer: string;
  title?: string;
  claims?: string[];
  commentary?: string[];
  questions?: string[];
  cards?: { question: string; answer: string }[];
  summary?: string;
  model?: string;
};
export async function getAiStatus(): Promise<AiStatus> {
  try {
    const r = await fetch("/api/status");
    if (!r.ok) throw new Error();
    return r.json();
  } catch {
    return {
      available: false,
      storage: false,
      models: [],
      message:
        "Você pode ler, anotar e revisar neste aparelho. A conexão de IA está indisponível.",
    };
  }
}
export async function assist(
  mode: AssistMode,
  prompt: string,
  context: string,
  sourceLabel: string,
): Promise<AssistResult> {
  const data = snapshot();
  const r = await fetch("/api/assist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(data.settings.cloudToken
        ? { Authorization: `Bearer ${data.settings.cloudToken}` }
        : {}),
    },
    body: JSON.stringify({
      mode,
      prompt,
      context,
      sourceLabel,
      model: data.settings.model,
    }),
  });
  const result = await r
    .json()
    .catch(() => ({ error: "A conexão foi interrompida. Tente novamente." }));
  if (!r.ok)
    throw new Error(result.error ?? "Não foi possível obter uma resposta.");
  return result;
}
