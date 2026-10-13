import { z } from "zod";
import type { Card, Settings, VaultData, Tombstone } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  theme: "paper",
  font: "serif",
  fontSize: 18,
  lineHeight: 1.75,
  width: 670,
  align: "left",
  indent: false,
  penColor: "#a84939",
  highlightColor: "#efcf69",
  numbers: true,
  focus: false,
  displayName: "Minha biblioteca",
  cloudEnabled: false,
  cloudToken: "",
  model: "openai",
};
const text = z.string();
const entity = { id: text.min(1), createdAt: text, updatedAt: text };
const source = z.object({
  ...entity,
  title: text,
  author: text,
  topic: text,
  readTime: text,
  pages: z.number(),
  publishedYear: text,
  progress: z.number().min(0).max(100),
  briefSummary: text,
  claims: z.array(text),
  paragraphs: z.array(
    z.object({
      id: z.number(),
      text,
      page: text.optional(),
      firstLetterDrop: z.boolean().optional(),
    }),
  ),
  spineColor: text,
  spineTextColor: text,
  spineHeight: z.number(),
  spineWidth: z.number(),
  format: text,
  origin: z.enum(["manual", "file", "link", "agent", "example", "catalog"]),
  url: text.optional(),
  fileId: text.optional(),
  fileName: text.optional(),
  mime: text.optional(),
  size: z.number().optional(),
  excerptOnly: z.boolean().optional(),
  fileSynced: z.boolean().optional(),
  lastReadAt: text.optional(),
  lastParagraph: z.number().optional(),
  agentName: text.optional(),
});
const note = z.object({
  ...entity,
  title: text,
  content: text,
  fonte: text,
  paginas: text,
  tags: z.array(text),
  claims: z.array(text),
  commentary: z.array(text),
  questions: z.array(text),
  citation: text,
  quote: text.optional(),
  paragraphId: z.number().optional(),
  highlights: z.array(text).optional(),
});
const card = z.object({
  ...entity,
  frente: text,
  verso: text,
  proxima: text,
  qualidade: z.number(),
  revisoes: z.number(),
  fonte: text,
  tags: z.array(text),
  noteId: text.optional(),
  paragraphId: z.number().optional(),
  location: text.optional(),
  learnerAnswer: text.optional(),
  interval: z.number(),
});
const margin = z.object({
  ...entity,
  sourceId: text,
  paragraphId: z.number(),
  quote: text.optional(),
  type: z.enum(["highlight", "note", "explain", "qa", "question", "reminder"]),
  title: text,
  content: text,
  start: z.number().optional(),
  end: z.number().optional(),
  color: text.optional(),
  reminder: text.optional(),
  noteId: text.optional(),
  page: text.optional(),
});
const relation = z.object({
  ...entity,
  from: text,
  to: text,
  kind: z.enum(["relaciona", "contradiz", "pre-requisito"]),
  reason: text,
  citation: text.optional(),
});
const settings = z.object({
  theme: z.enum(["paper", "sepia", "night"]),
  font: z.enum(["serif", "sans"]),
  fontSize: z.number().min(14).max(28),
  lineHeight: z.number().min(1.3).max(2.4),
  width: z.number().min(440).max(820),
  align: z.enum(["left", "justify"]),
  indent: z.boolean(),
  penColor: text,
  highlightColor: text,
  numbers: z.boolean(),
  focus: z.boolean(),
  displayName: text,
  cloudEnabled: z.boolean(),
  cloudToken: text,
  model: z.enum(["openai", "anthropic", "grok"]),
});
export const vaultSchema = z.object({
  version: z.literal(2),
  sources: z.array(source).max(2000),
  notes: z.array(note).max(10000),
  cards: z.array(card).max(20000),
  marginNotes: z.array(margin).max(20000),
  relations: z.array(relation).max(20000),
  reviews: z.array(
    z.object({
      id: text,
      cardId: text,
      answer: text,
      rating: z.number(),
      date: text,
      next: text,
    }),
  ),
  settings,
  activeSourceId: text,
  updatedAt: text,
  tombstones: z.array(
    z.object({
      id: text,
      collection: z.enum([
        "sources",
        "notes",
        "cards",
        "marginNotes",
        "relations",
      ]),
      at: text,
    }),
  ),
  profile: z.record(text, z.unknown()),
});

export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export function reviewInterval(card: Card, rating: number) {
  return rating === 1
    ? 1
    : rating === 2
      ? Math.max(2, Math.round(card.interval * 1.2))
      : rating === 3
        ? Math.max(4, Math.round(card.interval * 2))
        : Math.max(7, Math.round(card.interval * 2.7));
}
export function nextReview(card: Card, rating: number, date = new Date()) {
  const interval = reviewInterval(card, rating);
  const next = new Date(date);
  next.setDate(next.getDate() + interval);
  return { interval, proxima: localDay(next) };
}
export function isDue(card: Card, date = new Date()) {
  return card.proxima <= localDay(date);
}
export function mergeVault(local: VaultData, remote: VaultData): VaultData {
  const tombstones = new Map<string, Tombstone>();
  for (const t of [...remote.tombstones, ...local.tombstones]) {
    const key = `${t.collection}:${t.id}`;
    if (!tombstones.has(key) || t.at > tombstones.get(key)!.at)
      tombstones.set(key, t);
  }
  const merge = <T extends { id: string; updatedAt?: string }>(
    a: T[],
    b: T[],
    collection?: string,
  ): T[] => {
    const map = new Map<string, T>();
    for (const item of [...b, ...a]) {
      const previous = map.get(item.id);
      if (!previous || (item.updatedAt ?? "") >= (previous.updatedAt ?? ""))
        map.set(item.id, item);
    }
    return [...map.values()].filter(
      (item) =>
        !collection ||
        !tombstones.has(`${collection}:${item.id}`) ||
        tombstones.get(`${collection}:${item.id}`)!.at < (item.updatedAt ?? ""),
    );
  };
  const latest = local.updatedAt >= remote.updatedAt ? local : remote;
  return {
    ...latest,
    sources: merge(local.sources, remote.sources, "sources"),
    notes: merge(local.notes, remote.notes, "notes"),
    cards: merge(local.cards, remote.cards, "cards"),
    marginNotes: merge(local.marginNotes, remote.marginNotes, "marginNotes"),
    relations: merge(local.relations, remote.relations, "relations"),
    reviews: merge(local.reviews, remote.reviews),
    tombstones: [...tombstones.values()],
    settings: { ...latest.settings, cloudToken: local.settings.cloudToken },
    updatedAt: now(),
  };
}
