const DAY_MS = 86400000;

export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// 캐릭터를 만든 날을 1일째로 센다 (오늘 만들었으면 "1일째")
export function daysSince(iso: string, now = new Date()): number {
  const start = new Date(iso);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((nowDay.getTime() - startDay.getTime()) / DAY_MS) + 1;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function formatRelativeTime(iso: string, now = new Date()): string {
  const diffMin = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return formatDate(iso);
}
