import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type Deck = {
  subjectId: string;
  slug: string;
  unitCode: string;
  name: string;
  total: number;
  due: number;
  newCount: number;
  nextDueAt: string | null;
};

export type CardReview = {
  flashcardId: string;
  rating: "again" | "hard" | "good" | "easy";
  state: "new" | "learning" | "review";
  reviewCount: number;
  lapses: number;
  intervalDays: number;
  easePermille: number;
  dueAt: string;
  lastReviewedAt: string;
};

export type StudyCard = {
  id: string;
  topicId: string;
  subjectId: string;
  unitCode: string;
  subjectName: string;
  topicName: string;
  front: string;
  back: string;
  source: string | null;
  review: CardReview | null;
};

export type CardSession = {
  cards: StudyCard[];
  total: number;
  nextDueAt: string | null;
};

export type MindMapSummary = {
  subjectId: string;
  slug: string;
  unitCode: string;
  name: string;
  nodeCount: number;
};

export type MindMapNode = {
  id: string;
  key: string;
  parentKey: string | null;
  label: string;
  kind: "unit" | "topic" | "issue";
  depth: number;
  position: number;
};

export type MindMapData = MindMapSummary & { nodes: MindMapNode[] };

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
let token: string | null = null;

const storage = {
  async get(key: string) {
    if (Platform.OS === "web") {
      try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
    }
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async set(key: string, value: string) {
    if (Platform.OS === "web") {
      try { globalThis.localStorage?.setItem(key, value); } catch {}
      return;
    }
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
  async remove(key: string) {
    if (Platform.OS === "web") {
      try { globalThis.localStorage?.removeItem(key); } catch {}
      return;
    }
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};

async function raw(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Request failed");
  return body?.data ?? body;
}

async function ensureSession() {
  if (token) return token;
  token = await storage.get("barpar.token");
  if (token) {
    try {
      await raw("/v1/me");
      return token;
    } catch {
      token = null;
      await storage.remove("barpar.token");
    }
  }

  let deviceId = await storage.get("barpar.device");
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await storage.set("barpar.device", deviceId);
  }
  const auth = await raw("/v1/auth/guest", {
    method: "POST",
    body: JSON.stringify({ deviceId }),
  });
  token = auth.accessToken;
  await storage.set("barpar.token", token);
  return token;
}

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  await ensureSession();
  try {
    return await raw(path, init);
  } catch (error) {
    if (error instanceof Error && /expired|access token|unauthorized/i.test(error.message)) {
      token = null;
      await storage.remove("barpar.token");
      await ensureSession();
      return await raw(path, init);
    }
    throw error;
  }
}

export const api = {
  listDecks: () => authed<Deck[]>("/v1/decks"),
  startCardSession: (subjectId?: string) => authed<CardSession>("/v1/cards/session", {
    method: "POST",
    body: JSON.stringify({ ...(subjectId ? { subjectId } : {}), limit: 30 }),
  }),
  reviewCard: (cardId: string, rating: CardReview["rating"]) => authed<CardReview>(`/v1/cards/${cardId}/review`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  }),
  listMindMaps: () => raw("/v1/mind-maps") as Promise<MindMapSummary[]>,
  getMindMap: (slug: string) => raw(`/v1/mind-maps/${encodeURIComponent(slug)}`) as Promise<MindMapData>,
};
