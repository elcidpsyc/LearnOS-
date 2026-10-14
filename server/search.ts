import { z } from "zod";
import { HttpError } from "./storage.js";
const searchResults = z.object({
  results: z.array(
    z.object({
      title: z.string().nullish(),
      url: z.string().url(),
      text: z.string().nullish(),
    }),
  ),
});
export const searchReady = () => Boolean(process.env.EXA_API_KEY);
export async function searchWeb(query: string) {
  if (!searchReady())
    throw new HttpError(
      503,
      "A pesquisa na web ainda não foi conectada. Desative Web para conversar somente sobre o material.",
    );
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.EXA_API_KEY!,
    },
    body: JSON.stringify({
      query: query.slice(0, 1500),
      type: "auto",
      numResults: 5,
      contents: { text: { maxCharacters: 3000 } },
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new HttpError(
      502,
      "A pesquisa na web não respondeu. Tente novamente ou desative Web.",
    );
  const parsed = searchResults.safeParse(await response.json());
  if (!parsed.success)
    throw new HttpError(502, "A pesquisa não retornou fontes legíveis.");
  return parsed.data.results
    .filter((r) => /^https?:\/\//i.test(r.url))
    .map((r) => ({
      title: r.title || new URL(r.url).hostname,
      url: r.url,
      text: r.text?.slice(0, 3000) ?? "",
    }));
}
