import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Character,
  CharacterConfig,
  HitLogEntry,
} from "../types/character";
import { assignSlot } from "../utils/scatterLayout";
import { getHairStyle } from "../constants/hairStyles";
import {
  computeHpRecovery,
  computeHearingRecovery,
  computeHairRegrowCount,
} from "../utils/recovery";

interface CharacterStore {
  characters: Record<string, Character>;

  createCharacter: (name: string, config: CharacterConfig) => string;
  updateName: (id: string, name: string) => void;
  updateConfig: (id: string, patch: Partial<CharacterConfig>) => void;
  deleteCharacter: (id: string) => void;

  addSpeechBubble: (id: string, text: string) => void;
  removeSpeechBubble: (id: string, bubbleId: string) => void;

  hitWithSlingshot: (id: string, damage: number) => void;
  hitWithScream: (id: string, decibel: number) => void;
  pluckStrand: (id: string, strandIndex: number) => void;
  refillHair: (id: string) => void;
  regrowStrands: (id: string, count: number) => void;

  recoverHp: (id: string, amount: number) => void;
  recoverHearing: (id: string, amount: number) => void;

  // 마지막 회복 시점 이후 경과 시간만큼 HP / 청력 을 자동 회복해 반영
  settleHpRecovery: (id: string) => void;
  settleHearingRecovery: (id: string) => void;
  // 뽑힌 지 HAIR_REGROW_INTERVAL_HOURS 지난 가닥들을 자동으로 되살림
  settleHairRegrow: (id: string) => void;
}

const nowIso = () => new Date().toISOString();
const touch = (c: Character): Character => ({ ...c, updatedAt: nowIso() });

function logHit(
  c: Character,
  type: HitLogEntry["type"],
  meter: HitLogEntry["meter"],
  amount: number,
): Character {
  const entry: HitLogEntry = {
    id: crypto.randomUUID(),
    type,
    meter,
    amount,
    timestamp: nowIso(),
  };
  return {
    ...c,
    hitLog: [...c.hitLog, entry],
    stats: {
      ...c.stats,
      totalHits: c.stats.totalHits + 1,
      lastHitAt: entry.timestamp,
    },
  };
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set, get) => ({
      characters: {},

      createCharacter: (name, config) => {
        const existing = Object.values(get().characters);
        const slotIndex = assignSlot(existing.map((c) => c.slotIndex)); // 꽉 찼으면 여기서 에러

        const id = crypto.randomUUID();
        const character: Character = {
          id,
          name,
          slotIndex,
          config,
          stats: {
            totalHits: 0,
            lastHitAt: null,
            baldCount: 0,
            currentHp: 100,
            hpLastRecoveredAt: nowIso(),
            currentHearing: 100,
            hearingLastRecoveredAt: nowIso(),
          },
          hitLog: [],
          speechBubbles: [],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({ characters: { ...s.characters, [id]: character } }));
        return id;
      },

      updateName: (id, name) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          return {
            characters: { ...s.characters, [id]: touch({ ...c, name }) },
          };
        }),

      updateConfig: (id, patch) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...c, config: { ...c.config, ...patch } }),
            },
          };
        }),

      deleteCharacter: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.characters;
          return { characters: rest };
        }),

      addSpeechBubble: (id, text) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          const bubble = { id: crypto.randomUUID(), text, createdAt: nowIso() };
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...c,
                speechBubbles: [...c.speechBubbles, bubble],
              }),
            },
          };
        }),

      removeSpeechBubble: (id, bubbleId) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...c,
                speechBubbles: c.speechBubbles.filter((b) => b.id !== bubbleId),
              }),
            },
          };
        }),

      hitWithSlingshot: (id, damage) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          const hit = logHit(c, "slingshot", "hp", damage);
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...hit,
                stats: {
                  ...hit.stats,
                  currentHp: Math.max(0, hit.stats.currentHp - damage),
                },
              }),
            },
          };
        }),

      hitWithScream: (id, decibel) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          const damage = Math.min(20, (decibel / 100) * 20);
          const hit = logHit(c, "mic", "hearing", damage);
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...hit,
                stats: {
                  ...hit.stats,
                  currentHearing: Math.max(
                    0,
                    hit.stats.currentHearing - damage,
                  ),
                },
              }),
            },
          };
        }),

      pluckStrand: (id, strandIndex) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          if (c.config.hair.removedStrands.some((r) => r.index === strandIndex))
            return s;
          const hit = logHit(c, "hair", "hair", 1);
          const removedStrands = [
            ...hit.config.hair.removedStrands,
            { index: strandIndex, removedAt: nowIso() },
          ];
          // 이번 뽑기로 딱 대머리가 됐으면(전부 뽑힘) 업적 카운트 +1.
          // refillHair 로 리필해도 이 누적 카운트는 줄어들지 않는다.
          const totalStrands = getHairStyle(hit.config.hair.styleId).strands.length;
          const wentBald = removedStrands.length >= totalStrands;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...hit,
                stats: wentBald
                  ? { ...hit.stats, baldCount: hit.stats.baldCount + 1 }
                  : hit.stats,
                config: {
                  ...hit.config,
                  hair: { ...hit.config.hair, removedStrands },
                },
              }),
            },
          };
        }),

      // 즉시 리필 (버튼용) — 회복 대기 없이 바로 원상복구
      refillHair: (id) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...c,
                config: {
                  ...c.config,
                  hair: { ...c.config.hair, removedStrands: [] },
                },
              }),
            },
          };
        }),

      regrowStrands: (id, count) =>
        set((s) => {
          const c = s.characters[id];
          if (!c || count <= 0) return s;
          const sorted = [...c.config.hair.removedStrands].sort(
            (a, b) => +new Date(a.removedAt) - +new Date(b.removedAt),
          );
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...c,
                config: {
                  ...c.config,
                  hair: {
                    ...c.config.hair,
                    removedStrands: sorted.slice(count),
                  },
                },
              }),
            },
          };
        }),

      recoverHp: (id, amount) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...c,
                stats: {
                  ...c.stats,
                  currentHp: Math.min(100, c.stats.currentHp + amount),
                  hpLastRecoveredAt: nowIso(),
                },
              }),
            },
          };
        }),

      // 시간 경과 기반 자동 회복 (computeHpRecovery 로 계산) — 1 미만이면
      // 기준 시각을 그대로 둬서 다음 tick 에 누적되게 함
      settleHpRecovery: (id) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          const gain = computeHpRecovery(c);
          // 1 미만이면 대기 — 단, 마지막 남은 조각으로 100 을 채울 땐 적용
          if (gain <= 0 || (gain < 1 && c.stats.currentHp + gain < 100)) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...c,
                stats: {
                  ...c.stats,
                  currentHp: Math.min(100, c.stats.currentHp + gain),
                  hpLastRecoveredAt: nowIso(),
                },
              }),
            },
          };
        }),

      // 청력도 동일 패턴 (computeHearingRecovery)
      settleHearingRecovery: (id) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          const gain = computeHearingRecovery(c);
          if (
            gain <= 0 ||
            (gain < 1 && c.stats.currentHearing + gain < 100)
          )
            return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...c,
                stats: {
                  ...c.stats,
                  currentHearing: Math.min(100, c.stats.currentHearing + gain),
                  hearingLastRecoveredAt: nowIso(),
                },
              }),
            },
          };
        }),

      // regrowStrands 를 실제로 발동시키는 쪽 — computeHairRegrowCount 로 몇 가닥이
      // 다시 자랄 시점인지 계산해서 그만큼만 되살린다 (settleHpRecovery 와 동일 패턴)
      settleHairRegrow: (id) => {
        const c = get().characters[id];
        if (!c) return;
        const count = computeHairRegrowCount(c);
        if (count > 0) get().regrowStrands(id, count);
      },

      recoverHearing: (id, amount) =>
        set((s) => {
          const c = s.characters[id];
          if (!c) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...c,
                stats: {
                  ...c.stats,
                  currentHearing: Math.min(
                    100,
                    c.stats.currentHearing + amount,
                  ),
                  hearingLastRecoveredAt: nowIso(),
                },
              }),
            },
          };
        }),
    }),
    {
      name: "ihateyou-storage",
      version: 1,
      // v1: CharacterStats 에 baldCount 추가 — 이전에 저장된 캐릭터는 없는 값이라 0으로 채움
      migrate: (persisted, version) => {
        const state = persisted as { characters: Record<string, Character> };
        if (version < 1) {
          for (const c of Object.values(state.characters ?? {})) {
            if (c.stats.baldCount === undefined) c.stats.baldCount = 0;
          }
        }
        return state;
      },
    },
  ),
);
