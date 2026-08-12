export type AttackType = "slingshot" | "hair" | "mic";

export interface HairRemovedStrand {
  index: number;
  removedAt: string;
}

export interface HairState {
  styleId: string;
  color?: string;
  removedStrands: HairRemovedStrand[];
}

export interface CharacterConfig {
  headShape: string;
  bodyColor: string; // skinTone 대체 — 몸 전체 단색
  faceImage: string; // 캔버스로 그린 눈코입 (있다면 위에 합성)
  hair: HairState;
}

export interface SpeechBubble {
  id: string;
  text: string;
  createdAt: string;
}

export interface HitLogEntry {
  id: string;
  type: AttackType;
  meter: "hp" | "hearing" | "hair";
  amount: number;
  timestamp: string;
}

export interface CharacterStats {
  totalHits: number;
  streakDays: number;
  lastHitAt: string | null;

  currentHp: number;
  hpLastRecoveredAt: string;

  currentHearing: number;
  hearingLastRecoveredAt: string;
}

export interface Character {
  id: string;
  name: string;
  config: CharacterConfig;
  stats: CharacterStats;
  hitLog: HitLogEntry[];
  speechBubbles: SpeechBubble[];
  createdAt: string;
  updatedAt: string;
}

// 머리카락 % 는 저장하지 않고 항상 계산해서 씀 (단일 소스)
export function hairRemainingPercent(
  character: Character,
  strandCount = 100,
): number {
  const removed = character.config.hair.removedStrands.length;
  return Math.round(((strandCount - removed) / strandCount) * 100);
}
