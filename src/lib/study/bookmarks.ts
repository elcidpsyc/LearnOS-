export type Bookmark = { title: string; url: string };
function cleanUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return;
    url.hash = "";
    return url.href;
  } catch {
    return;
  }
}
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" && !quoted) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}
export function parseBookmarkText(text: string): Bookmark[] {
  const output: Bookmark[] = [];
  const seen = new Set<string>();
  const add = (url: unknown, title: unknown) => {
    const clean = cleanUrl(url);
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    output.push({
      url: clean,
      title:
        typeof title === "string" && title.trim()
          ? title.trim()
          : new URL(clean).hostname,
    });
  };
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    const items = Array.isArray(data)
      ? data
      : (data.items ?? data.bookmarks ?? []);
    if (!Array.isArray(items))
      throw new Error("O JSON precisa conter uma lista de bookmarks.");
    for (const item of items)
      if (typeof item === "string") add(item, "");
      else if (item)
        add(item.url ?? item.link ?? item.href, item.title ?? item.name);
  } else if (/<a\b/i.test(text)) {
    // This parser only extracts attributes/text; HTML is never inserted in the app.
    const decode = (s: string) =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
    for (const m of text.matchAll(
      /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    ))
      add(decode(m[1]), decode(m[2].replace(/<[^>]*>/g, "")));
  } else {
    const rows = parseCsv(text);
    const header = rows[0]?.map((c) => c.trim().toLowerCase()) ?? [];
    const urlColumn = header.findIndex((c) =>
      ["url", "link", "href"].includes(c),
    );
    const titleColumn = header.findIndex((c) =>
      ["title", "name", "titulo", "título"].includes(c),
    );
    if (urlColumn >= 0)
      for (const row of rows.slice(1)) add(row[urlColumn], row[titleColumn]);
    else for (const line of text.split(/\r?\n/)) add(line, "");
  }
  return output;
}
