import type { Character } from "../types/character";

const HP_RECOVERY_PER_HOUR = 100 / 24; // 24시간에 걸쳐 완전 회복
const HAIR_REGROW_INTERVAL_HOURS = 12; // 12시간마다 1가닥

export function computeHpRecovery(
  character: Character,
  now = new Date(),
): number {
  const hours =
    (now.getTime() - new Date(character.stats.hpLastRecoveredAt).getTime()) /
    3600000;
  return Math.min(
    100 - character.stats.currentHp,
    Math.max(0, hours * HP_RECOVERY_PER_HOUR),
  );
}

export function computeHairRegrowCount(
  character: Character,
  now = new Date(),
): number {
  const sorted = [...character.config.hair.removedStrands].sort(
    (a, b) => +new Date(a.removedAt) - +new Date(b.removedAt),
  );
  let count = 0;
  for (const strand of sorted) {
    const hours =
      (now.getTime() - new Date(strand.removedAt).getTime()) / 3600000;
    if (hours >= HAIR_REGROW_INTERVAL_HOURS) count++;
    else break;
  }
  return count;
}
