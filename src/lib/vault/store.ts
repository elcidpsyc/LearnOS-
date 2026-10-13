import { useSyncExternalStore } from "react";
import { freshVault } from "./seed";
import { migrateVault } from "./migrate";
import { id, now, nextReview, vaultSchema, mergeVault } from "./model";
import type {
  VaultData,
  Source,
  Note,
  Card,
  MarginNote,
  Settings,
  Relation,
  TabId,
  Selection,
} from "./types";
export type * from "./types";
export const STORAGE_KEY = "learning_os_v2";
type Runtime = {
  hydrated: boolean;
  tab: TabId;
  selectedNoteId: string | null;
  shelfFilter: string;
  shelfSort: "topic" | "recent" | "length";
  selection: Selection | null;
  storageError: string;
  cloudStatus: "local" | "saving" | "synced" | "error";
  cloudError: string;
  cloudEtag: string;
  settingsOpen: boolean;
};
type Actions = {
  setTab: (tab: TabId) => void;
  setActiveSourceId: (id: string) => void;
  selectNote: (id: string | null) => void;
  setShelfFilter: (f: string) => void;
  setShelfSort: (sort: Runtime["shelfSort"]) => void;
  setSelection: (s: Selection | null) => void;
  saveSettings: (settings: Partial<Settings>) => void;
  setSettingsOpen: (open: boolean) => void;
  addSource: (s: Omit<Source, "id" | "createdAt" | "updatedAt">) => string;
  updateSource: (id: string, updates: Partial<Source>) => void;
  deleteSource: (id: string) => void;
  addNote: (n: Omit<Note, "id" | "createdAt" | "updatedAt">) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addCard: (
    c: Omit<Card, "id" | "createdAt" | "updatedAt" | "interval"> & {
      interval?: number;
    },
  ) => string;
  deleteCard: (id: string) => void;
  reviewCard: (id: string, rating: number, answer: string) => void;
  addMarginNote: (
    n: Omit<MarginNote, "id" | "createdAt" | "updatedAt">,
  ) => string;
  deleteMarginNote: (id: string) => void;
  addRelation: (r: Omit<Relation, "id" | "createdAt" | "updatedAt">) => void;
  deleteRelation: (id: string) => void;
  replaceVault: (d: VaultData) => void;
  syncCloud: () => Promise<void>;
  connectCloud: (token?: string) => Promise<void>;
  disconnectCloud: () => void;
};
type State = VaultData & Runtime & Actions;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let state: State;
let syncInFlight: Promise<void> | null = null;
function emit() {
  for (const f of listeners) f();
}
export function snapshot(): VaultData {
  const {
    sources,
    notes,
    cards,
    marginNotes,
    relations,
    reviews,
    settings,
    activeSourceId,
    updatedAt,
    tombstones,
    profile,
  } = state;
  return {
    version: 2,
    sources,
    notes,
    cards,
    marginNotes,
    relations,
    reviews,
    settings,
    activeSourceId,
    updatedAt,
    tombstones,
    profile,
  };
}
function persist() {
  if (!state.hydrated || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
    state = { ...state, storageError: "" };
  } catch {
    state = {
      ...state,
      storageError:
        "O armazenamento deste aparelho está cheio ou indisponível. Faça um backup antes de fechar.",
    };
  }
}
function update(partial: Partial<State>, durable = true) {
  state = { ...state, ...partial, ...(durable ? { updatedAt: now() } : {}) };
  if (durable) {
    persist();
    if (state.settings.cloudEnabled) {
      clearTimeout(timer);
      timer = setTimeout(() => void state.syncCloud().catch(() => {}), 1600);
    }
  }
  emit();
}
function remove(
  collection: "sources" | "notes" | "cards" | "marginNotes" | "relations",
  target: string,
) {
  update({
    [collection]: state[collection].filter((n) => n.id !== target),
    tombstones: [...state.tombstones, { id: target, collection, at: now() }],
  } as Partial<State>);
}
const actions: Actions = {
  setTab: (tab) => {
    update({ tab, selection: null }, false);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "instant" });
  },
  setActiveSourceId: (activeSourceId) =>
    update({ activeSourceId, selection: null }),
  selectNote: (selectedNoteId) => update({ selectedNoteId }, false),
  setShelfFilter: (shelfFilter) => update({ shelfFilter }, false),
  setShelfSort: (shelfSort) => update({ shelfSort }, false),
  setSelection: (selection) => update({ selection }, false),
  setSettingsOpen: (settingsOpen) => update({ settingsOpen }, false),
  saveSettings: (settings) =>
    update({ settings: { ...state.settings, ...settings } }),
  addSource: (s) => {
    const existing = s.url
      ? state.sources.find((n) => n.url === s.url)
      : undefined;
    if (existing) return existing.id;
    const source = { ...s, id: id(), createdAt: now(), updatedAt: now() };
    update({ sources: [source, ...state.sources] });
    return source.id;
  },
  updateSource: (target, updates) =>
    update({
      sources: state.sources.map((s) =>
        s.id === target ? { ...s, ...updates, id: s.id, updatedAt: now() } : s,
      ),
    }),
  deleteSource: (target) => {
    const noteIds = state.notes
      .filter((n) => n.fonte === target)
      .map((n) => n.id);
    for (const n of state.notes.filter((n) => n.fonte === target))
      remove("notes", n.id);
    for (const n of state.cards.filter((n) => n.fonte === target))
      remove("cards", n.id);
    for (const n of state.marginNotes.filter((n) => n.sourceId === target))
      remove("marginNotes", n.id);
    for (const n of state.relations.filter(
      (n) => noteIds.includes(n.from) || noteIds.includes(n.to),
    ))
      remove("relations", n.id);
    remove("sources", target);
    if (state.activeSourceId === target)
      update({ activeSourceId: state.sources[0]?.id ?? "" });
  },
  addNote: (n) => {
    const note = { ...n, id: id(), createdAt: now(), updatedAt: now() };
    update({ notes: [note, ...state.notes], selectedNoteId: note.id });
    return note.id;
  },
  updateNote: (target, updates) =>
    update({
      notes: state.notes.map((n) =>
        n.id === target ? { ...n, ...updates, id: n.id, updatedAt: now() } : n,
      ),
    }),
  deleteNote: (target) => {
    for (const r of state.relations.filter(
      (r) => r.from === target || r.to === target,
    ))
      remove("relations", r.id);
    remove("notes", target);
    update({ selectedNoteId: null }, false);
  },
  addCard: (c) => {
    const card = {
      ...c,
      id: id(),
      createdAt: now(),
      updatedAt: now(),
      interval: c.interval ?? 1,
    };
    update({ cards: [card, ...state.cards] });
    return card.id;
  },
  deleteCard: (target) => remove("cards", target),
  reviewCard: (target, rating, answer) => {
    const c = state.cards.find((c) => c.id === target);
    if (!c) return;
    const schedule = nextReview(c, rating);
    update({
      cards: state.cards.map((c) =>
        c.id === target
          ? {
              ...c,
              ...schedule,
              qualidade: rating,
              revisoes: c.revisoes + 1,
              learnerAnswer: answer,
              updatedAt: now(),
            }
          : c,
      ),
      reviews: [
        {
          id: id(),
          cardId: target,
          answer,
          rating,
          date: now(),
          next: schedule.proxima,
        },
        ...state.reviews,
      ],
      profile: { ...state.profile, lastSession: now(), lastAnswer: answer },
    });
  },
  addMarginNote: (n) => {
    const mark = { ...n, id: id(), createdAt: now(), updatedAt: now() };
    update({ marginNotes: [...state.marginNotes, mark] });
    return mark.id;
  },
  deleteMarginNote: (target) => remove("marginNotes", target),
  addRelation: (r) =>
    update({
      relations: [
        ...state.relations,
        { ...r, id: id(), createdAt: now(), updatedAt: now() },
      ],
    }),
  deleteRelation: (target) => remove("relations", target),
  replaceVault: (data) =>
    update({
      ...(vaultSchema.parse(data) as VaultData),
      settings: { ...data.settings, cloudEnabled: false, cloudToken: "" },
      selection: null,
    }),
  syncCloud: async () => {
    if (!state.settings.cloudEnabled || !state.settings.cloudToken) return;
    if (syncInFlight) return syncInFlight;
    const token = state.settings.cloudToken;
    syncInFlight = (async () => {
      update({ cloudStatus: "saving", cloudError: "" }, false);
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        const read = await fetch("/api/workspace", { headers });
        let data = snapshot();
        let etag = "";
        if (read.ok) {
          const remote = await read.json();
          data = mergeVault(data, vaultSchema.parse(remote.data) as VaultData);
          etag = read.headers.get("ETag") ?? "";
        } else if (read.status !== 404)
          throw new Error(
            (await read.json()).error ?? "A sincronização não está disponível.",
          );
        const captured = data.updatedAt;
        const publicData = {
          ...data,
          settings: { ...data.settings, cloudToken: "", cloudEnabled: false },
        };
        const write = await fetch("/api/workspace", {
          method: "PUT",
          headers: { ...headers, ...(etag ? { "If-Match": etag } : {}) },
          body: JSON.stringify({ data: publicData }),
        });
        if (write.status === 409)
          throw new Error(
            "O espaço mudou em outro aparelho. Toque em sincronizar novamente para reunir as alterações.",
          );
        if (!write.ok)
          throw new Error(
            (await write.json()).error ?? "Não foi possível sincronizar.",
          );
        const latest = snapshot();
        data = latest.updatedAt > captured ? mergeVault(latest, data) : data;
        let finalEtag = write.headers.get("ETag") ?? "";
        if (data.sources.some((s) => s.fileId && !s.fileSynced)) {
          const { syncFiles } = await import("./files");
          const synced = await syncFiles(data, token);
          if (synced.length) {
            data = {
              ...data,
              sources: data.sources.map((s) =>
                synced.includes(s.id)
                  ? { ...s, fileSynced: true, updatedAt: now() }
                  : s,
              ),
              updatedAt: now(),
            };
            const response = await fetch("/api/workspace", {
              method: "PUT",
              headers: { ...headers, "If-Match": finalEtag },
              body: JSON.stringify({
                data: {
                  ...data,
                  settings: {
                    ...data.settings,
                    cloudToken: "",
                    cloudEnabled: false,
                  },
                },
              }),
            });
            if (!response.ok)
              throw new Error(
                "Os arquivos foram enviados. Sincronize novamente para concluir o caderno.",
              );
            finalEtag = response.headers.get("ETag") ?? "";
          }
        }
        const newer = snapshot();
        if (newer.updatedAt > data.updatedAt) data = mergeVault(newer, data);
        state = {
          ...state,
          ...data,
          settings: { ...data.settings, cloudEnabled: true, cloudToken: token },
          cloudStatus: "synced",
          cloudEtag: finalEtag,
          cloudError: "",
        };
        persist();
        emit();
      } catch (error) {
        update(
          {
            cloudStatus: "error",
            cloudError:
              error instanceof Error
                ? error.message
                : "Não foi possível sincronizar.",
          },
          false,
        );
        throw error;
      }
    })().finally(() => {
      syncInFlight = null;
    });
    return syncInFlight;
  },
  connectCloud: async (token) => {
    const cloudToken =
      token?.trim() ||
      Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
    if (!/^[a-f0-9]{64}$/.test(cloudToken))
      throw new Error("A chave do espaço deve conter 64 caracteres.");
    update({ settings: { ...state.settings, cloudEnabled: true, cloudToken } });
    await actions.syncCloud();
  },
  disconnectCloud: () =>
    update({
      settings: { ...state.settings, cloudEnabled: false },
      cloudStatus: "local",
    }),
};
state = {
  ...freshVault(),
  ...actions,
  hydrated: false,
  tab: "fontes",
  selectedNoteId: null,
  shelfFilter: "all",
  shelfSort: "recent",
  selection: null,
  storageError: "",
  cloudStatus: "local",
  cloudError: "",
  cloudEtag: "",
  settingsOpen: false,
};
export function hydrateVault() {
  if (state.hydrated || typeof localStorage === "undefined") return;
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy =
      current ??
      localStorage.getItem("learning_os_vault") ??
      localStorage.getItem("learning-os-v1");
    if (legacy) state = { ...state, ...migrateVault(JSON.parse(legacy)) };
  } catch {
    state = {
      ...state,
      storageError:
        "Não foi possível ler os dados salvos. O conteúdo original foi preservado para recuperação.",
    };
  }
  state = { ...state, hydrated: true };
  emit();
  if (!state.storageError) persist();
  if (state.settings.cloudEnabled) void actions.syncCloud().catch(() => {});
}
export function useVault<T>(selector: (state: State) => T): T {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => selector(state),
    () => selector(state),
  );
}
export const FONTE_LABEL: Record<string, string> = Object.fromEntries(
  freshVault().sources.map((s) => [s.id, s.title]),
);
