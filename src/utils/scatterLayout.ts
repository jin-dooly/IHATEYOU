export interface ScatterPosition {
  x: number;
  y: number;
}

export const SLOT_GAP_RATIO = 0.38; // FIXED_SLOTS 생성 시에만 쓰이는 값

export const MAX_CHARACTERS = 10;
export const ITEM_SIZE = 56;
export const SCATTER_WIDTH = 400;
export const SCATTER_HEIGHT = 700;

// 미리 계산해둔, 절대 겹치지 않는 10자리 (중심 좌표 기준)
// 재생성 방법: npm run generate:slots
export const FIXED_SLOTS: ScatterPosition[] = [
  { x: 221.0, y: 446.7 },
  { x: 67.3, y: 290.5 },
  { x: 379.3, y: 431.3 },
  { x: 224.6, y: 198.7 },
  { x: 275.4, y: 326.7 },
  { x: 103.0, y: 80.1 },
  { x: 306.1, y: 648.5 },
  { x: 96.8, y: 497.9 },
  { x: 40.7, y: 604.7 },
  { x: 354.2, y: 146.0 },
];

export function assignSlot(usedSlotIndexes: number[]): number {
  const used = new Set(usedSlotIndexes);
  for (let i = 0; i < MAX_CHARACTERS; i++) {
    if (!used.has(i)) return i;
  }
  throw new Error(`캐릭터는 최대 ${MAX_CHARACTERS}개까지 만들 수 있어요`);
}
