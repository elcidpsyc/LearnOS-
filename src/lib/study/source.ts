import type { Source, Paragraph } from "../vault/types";
export const sourceColors = [
  "#79639a",
  "#8b845a",
  "#55757a",
  "#a96f55",
  "#5a6d88",
  "#737d5c",
  "#966571",
];
export function sourceDraft(
  title: string,
  text: string,
  author = "Autor não informado",
  topic = "Sem categoria",
): Omit<Source, "id" | "createdAt" | "updatedAt"> {
  const paragraphs: Paragraph[] = text
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text, i) => ({ id: i + 1, text, firstLetterDrop: i === 0 }));
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const hash = [...title].reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    title,
    author,
    topic,
    readTime: `${Math.max(1, Math.ceil(words / 220))} min`,
    pages: 0,
    publishedYear: "",
    progress: 0,
    briefSummary: "",
    claims: [],
    paragraphs,
    spineColor: sourceColors[hash % sourceColors.length],
    spineTextColor: "#faf6ed",
    spineHeight: 174 + (hash % 42),
    spineWidth: 32 + (hash % 14),
    format: "Texto",
    origin: "manual",
    excerptOnly: false,
  };
}
