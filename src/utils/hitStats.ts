import type { AttackType, HitLogEntry } from "../types/character";
import { toDayKey } from "./dateUtils";

export function countHitsOn(hitLog: HitLogEntry[], date: Date): number {
  const key = toDayKey(date);
  return hitLog.filter((h) => toDayKey(new Date(h.timestamp)) === key).length;
}

// 오늘(또는 어제, 오늘 기록이 아직 없으면)부터 거꾸로 하루도 안 거르고
// 타격한 날이 며칠 연속인지. 마지막 타격이 그저께 이전이면 0.
export function computeStreakDays(hitLog: HitLogEntry[], now = new Date()): number {
  const days = new Set(hitLog.map((h) => toDayKey(new Date(h.timestamp))));
  const cursor = new Date(now);
  if (!days.has(toDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(toDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function countByAttackType(hitLog: HitLogEntry[]): Record<AttackType, number> {
  const counts: Record<AttackType, number> = { slingshot: 0, hair: 0, mic: 0 };
  for (const h of hitLog) counts[h.type]++;
  return counts;
}

export interface DailyHitCount {
  date: Date;
  count: number;
}

// 오늘을 포함해 최근 n일치 일별 타격 횟수 (과거 -> 오늘 순)
export function lastNDaysHitCounts(
  hitLog: HitLogEntry[],
  n: number,
  now = new Date(),
): DailyHitCount[] {
  const result: DailyHitCount[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push({ date: d, count: countHitsOn(hitLog, d) });
  }
  return result;
}
