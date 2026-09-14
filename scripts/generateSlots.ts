/*
--- FIXED_SLOTS(홈 랜덤배치 상수) 변경 함수 ---
[실행 방법]
npm run generate:slots
[참고]
경고가 계속 뜨면 (MAX_CHARACTERS는 많은데 SCATTER_WIDTH/HEIGHT는 작은 경우) 물리적으로 그 공간에 그만큼 안 들어간다는 뜻.
그럴 땐 ATTEMPTS_PER_POINT를 늘려도 크게 도움 안 되고, SCATTER_HEIGHT를 늘리거나 SLOT_GAP_RATIO를 줄이는 쪽으로 상수를 조정
*/

import {
  MAX_CHARACTERS,
  ITEM_SIZE,
  SLOT_GAP_RATIO,
  SCATTER_WIDTH,
  SCATTER_HEIGHT,
} from "../src/utils/scatterLayout";

interface Point {
  x: number;
  y: number;
}

const MIN_DIST = ITEM_SIZE * (1 + SLOT_GAP_RATIO);
const MARGIN = ITEM_SIZE / 2;
const ATTEMPTS_PER_POINT = 2000;

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function generateSlots(): Point[] {
  const points: Point[] = [];

  for (let i = 0; i < MAX_CHARACTERS; i++) {
    let best: Point | null = null;
    let bestDist = -Infinity;

    for (let attempt = 0; attempt < ATTEMPTS_PER_POINT; attempt++) {
      const candidate: Point = {
        x: MARGIN + Math.random() * (SCATTER_WIDTH - MARGIN * 2),
        y: MARGIN + Math.random() * (SCATTER_HEIGHT - MARGIN * 2),
      };
      const nearest =
        points.length === 0
          ? Infinity
          : Math.min(...points.map((p) => dist(p, candidate)));

      if (nearest >= MIN_DIST) {
        best = candidate;
        break;
      }
      if (nearest > bestDist) {
        bestDist = nearest;
        best = candidate;
      }
    }
    points.push(best!);
  }

  return points;
}

function minPairDistance(points: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      min = Math.min(min, dist(points[i], points[j]));
    }
  }
  return min;
}

const slots = generateSlots();
const achieved = minPairDistance(slots);
const ok = achieved >= MIN_DIST;

console.log(
  `// 기준: MAX_CHARACTERS=${MAX_CHARACTERS}, ITEM_SIZE=${ITEM_SIZE}, SCATTER=${SCATTER_WIDTH}x${SCATTER_HEIGHT}, GAP_RATIO=${SLOT_GAP_RATIO}`,
);
console.log(
  `// 실제 최소 거리: ${achieved.toFixed(1)}px (요구치 ${MIN_DIST.toFixed(1)}px) ${ok ? "✅" : "⚠️ 겹침 위험 — 재실행하거나 SCATTER 크기를 늘려보세요"}`,
);
console.log("export const FIXED_SLOTS: ScatterPosition[] = [");
slots.forEach(({ x, y }) => {
  console.log(`  { x: ${x.toFixed(1)}, y: ${y.toFixed(1)} },`);
});
console.log("];");
