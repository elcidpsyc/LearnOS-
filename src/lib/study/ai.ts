import { snapshot } from "../vault/store";
import type { AnswerReference, ConversationTurn, Source } from "../vault/types";
export type AiStatus = {
  available: boolean;
  storage: boolean;
  models: { id: string; label: string }[];
  message?: string;
  webSearch?: boolean;
};
export type AssistMode =
  | "ask"
  | "translate"
  | "explain"
  | "distill"
  | "socratic"
  | "compare"
  | "flashcard"
  | "summary"
  | "define"
  | "simplify"
  | "factcheck"
  | "overview"
  | "classify";
export type AssistResult = {
  answer: string;
  title?: string;
  claims?: string[];
  commentary?: string[];
  questions?: string[];
  cards?: { question: string; answer: string }[];
  summary?: string;
  model?: string;
  references?: AnswerReference[];
  overview?: Omit<NonNullable<Source["overview"]>, "generatedAt" | "model">;
  classification?: { topic: string; tags: string[] };
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
  options: {
    history?: ConversationTurn[];
    web?: boolean;
    signal?: AbortSignal;
    depth?: "quick" | "deep";
  } = {},
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
      depth: options.depth ?? data.settings.answerDepth,
      length: data.settings.answerLength,
      web: options.web ?? false,
      history: (options.history ?? [])
        .slice(-12)
        .map(({ role, content }) => ({
          role,
          content: content.slice(0, 12000),
        })),
    }),
    signal: options.signal,
  });
  const result = await r
    .json()
    .catch(() => ({ error: "A conexão foi interrompida. Tente novamente." }));
  if (!r.ok)
    throw new Error(result.error ?? "Não foi possível obter uma resposta.");
  return result;
}
