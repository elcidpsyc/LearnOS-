import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { publicHTML } from "./safe-fetch.js";
import { HttpError } from "./storage.js";
export async function article(url) {
    const fetched = await publicHTML(url);
    const { document } = parseHTML(fetched.html);
    const fallbackTitle = document.querySelector("title")?.textContent;
    const author = document.querySelector('meta[name="author"]')?.getAttribute("content") ??
        document
            .querySelector('meta[property="article:author"]')
            ?.getAttribute("content") ??
        "";
    const parsed = new Readability(document, {
        charThreshold: 100,
    }).parse();
    if (!parsed?.content)
        throw new HttpError(422, "Não encontrei um artigo legível. Cole o recorte ou importe um arquivo.");
    const content = parseHTML(`<html><body>${parsed.content}</body></html>`).document;
    const text = [...content.querySelectorAll("h1,h2,h3,p,li,blockquote")]
        .map((n) => n.textContent?.replace(/\s+/g, " ").trim() ?? "")
        .filter(Boolean)
        .join("\n\n");
    if (text.length < 100)
        throw new HttpError(422, "Esta página não tem texto suficiente para extrair. Cole um recorte.");
    return {
        title: parsed.title || fallbackTitle || new URL(fetched.url).hostname,
        author: parsed.byline || author || "Autor não informado",
        text: text.slice(0, 500000),
        url: fetched.url,
    };
}
