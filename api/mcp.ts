import {
  authorizedWorkspace,
  writeWorkspace,
  body,
  json,
  failure,
  HttpError,
} from "../server/storage";
import { article } from "../server/article";
import { sourceDraft } from "../src/lib/study/source";
export const maxDuration = 30;
const tools = [
  {
    name: "list_sources",
    description:
      "Lista fontes da biblioteca privada com título, autor, tema e localização.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "read_source",
    description: "Lê os trechos salvos de uma fonte.",
    inputSchema: {
      type: "object",
      properties: { sourceId: { type: "string" } },
      required: ["sourceId"],
      additionalProperties: false,
    },
  },
  {
    name: "list_notes",
    description:
      "Lista notas canônicas com citações, claims, comentários e perguntas.",
    inputSchema: {
      type: "object",
      properties: { sourceId: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "add_source",
    description:
      "Adiciona um artigo público ou recorte à biblioteca. Não adiciona material sem texto.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        author: { type: "string" },
        topic: { type: "string" },
        text: { type: "string" },
        agentName: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "add_note",
    description:
      "Registra uma nota com fonte e localização verificáveis. Separa claims e comentário.",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: { type: "string" },
        title: { type: "string" },
        location: { type: "string" },
        claims: { type: "array", items: { type: "string" } },
        commentary: { type: "array", items: { type: "string" } },
        questions: { type: "array", items: { type: "string" } },
      },
      required: ["sourceId", "title", "location", "claims"],
      additionalProperties: false,
    },
  },
];
export async function POST(req: Request) {
  try {
    const auth = await authorizedWorkspace(req);
    const rpc = await body(req);
    const reply = (result: unknown) =>
      json({ jsonrpc: "2.0", id: rpc.id ?? null, result });
    if (rpc.method === "initialize")
      return reply({
        protocolVersion: "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "LearnOS", version: "1.0.0" },
      });
    if (rpc.method?.startsWith("notifications/"))
      return new Response(null, { status: 202 });
    if (rpc.method === "ping") return reply({});
    if (rpc.method === "tools/list") return reply({ tools });
    if (rpc.method !== "tools/call")
      return json({
        jsonrpc: "2.0",
        id: rpc.id ?? null,
        error: { code: -32601, message: "Método não disponível." },
      });
    const name = rpc.params?.name,
      args = rpc.params?.arguments ?? {},
      data = auth.data;
    let output: unknown;
    if (name === "list_sources")
      output = data.sources.map(
        ({ id, title, author, topic, url, progress, origin }) => ({
          id,
          title,
          author,
          topic,
          url,
          progress,
          origin,
        }),
      );
    else if (name === "read_source") {
      const source = data.sources.find((s) => s.id === args.sourceId);
      if (!source) throw new HttpError(404, "Fonte não encontrada.");
      output = source;
    } else if (name === "list_notes")
      output = data.notes.filter(
        (n) => !args.sourceId || n.fonte === args.sourceId,
      );
    else if (name === "add_source") {
      let imported =
        typeof args.url === "string"
          ? await article(args.url)
          : {
              title: args.title,
              author: args.author,
              text: args.text,
              url: undefined,
            };
      if (
        !imported.title ||
        typeof imported.text !== "string" ||
        imported.text.length < 10 ||
        imported.text.length > 500000
      )
        throw new HttpError(
          400,
          "Forneça um título e um texto verificável de até 500 mil caracteres.",
        );
      const existing = imported.url
        ? data.sources.find((s) => s.url === imported.url)
        : undefined;
      if (existing) output = { id: existing.id, alreadyExists: true };
      else {
        const stamp = new Date().toISOString();
        const source = {
          ...sourceDraft(
            imported.title,
            imported.text,
            imported.author ?? "Autor não informado",
            args.topic ?? "Sem categoria",
          ),
          id: crypto.randomUUID(),
          origin: "agent" as const,
          agentName: args.agentName ?? "Agente conectado",
          url: imported.url,
          createdAt: stamp,
          updatedAt: stamp,
        };
        data.sources.unshift(source);
        data.updatedAt = stamp;
        await writeWorkspace(auth.token, data, auth.etag);
        output = { id: source.id, title: source.title };
      }
    } else if (name === "add_note") {
      const source = data.sources.find((s) => s.id === args.sourceId);
      if (
        !source ||
        typeof args.title !== "string" ||
        typeof args.location !== "string" ||
        !args.location.trim() ||
        !Array.isArray(args.claims) ||
        !args.claims.every((c: unknown) => typeof c === "string")
      )
        throw new HttpError(
          400,
          "A nota precisa de fonte existente, título, localização e claims.",
        );
      const stamp = new Date().toISOString();
      const note = {
        id: crypto.randomUUID(),
        title: args.title.slice(0, 200),
        fonte: source.id,
        paginas: args.location,
        tags: [source.topic],
        content: args.claims.join("\n"),
        claims: args.claims,
        commentary: args.commentary ?? [],
        questions: args.questions ?? [],
        citation: `${source.author}. ${source.title}, ${args.location}.`,
        createdAt: stamp,
        updatedAt: stamp,
      };
      data.notes.unshift(note);
      data.updatedAt = stamp;
      await writeWorkspace(auth.token, data, auth.etag);
      output = { id: note.id };
    } else
      return json({
        jsonrpc: "2.0",
        id: rpc.id ?? null,
        error: { code: -32602, message: "Ferramenta não encontrada." },
      });
    return reply({
      content: [{ type: "text", text: JSON.stringify(output) }],
      isError: false,
    });
  } catch (e) {
    return failure(e);
  }
}
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
