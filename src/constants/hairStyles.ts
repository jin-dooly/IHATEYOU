// 헤어스타일 정의.
//
// - config.hair.styleId 가 여기 id 와 대응된다.
// - config.hair.removedStrands 의 index 는 strands 배열의 인덱스를 가리킨다
//   (뽑히면 그 index 가 removedStrands 에 기록되고, CharacterFigure 는 렌더링에서 제외한다).
// - viewBox 는 CharacterFigure 와 동일한 "0 0 160 222" 좌표계를 그대로 쓴다.
//   얼굴 클립 원(정수리 기준): cx=70 cy=60 r=42.
// - 가닥 path 는 반드시 두피 쪽(뽑을 때 잡는 지점) 끝에서 절대좌표
//   "M x y ..." 로 시작해서 그려야 한다. 뽑기 인터랙션이 이 시작점을
//   그대로 grab anchor 로 사용한다 (parseStrandAnchor 참고).
// - CharacterFigure 는 이 path 들을 fill 없이 stroke 로만 그린다
//   (FaceCanvas 의 눈코입과 같은 방식 — 채워진 도형이 아니라 선/윤곽선으로
//   그려질 것을 가정). 색은 hair.color 가 그대로 stroke 색이 된다.
export interface HairStrand {
  d: string;
}

export interface HairStyleDef {
  id: string;
  label: string;
  strands: HairStrand[]; // index = removedStrands 에 기록되는 strandIndex
  strokeWidth?: number; // 기본값은 CharacterFigure 쪽에서 3
}

// ⚠️ 임시 플레이스홀더입니다. 실제로는 디자인팀(=나)이 손으로 그린 가닥
// path 로 교체할 예정 — 지금은 뽑기 로직/인터랙션 확인용으로 부채꼴로
// 절차 생성했습니다. strands 배열만 실제 path 로 바꿔 끼우면 나머지 로직은
// 그대로 동작합니다.
function tempFanStrands(count: number): HairStrand[] {
  const CX = 70;
  const CY = 60;
  const R = 42; // 얼굴 원(face-clip) 반지름과 동일
  const LEN = 16; // 가닥 길이
  const START_DEG = -160;
  const END_DEG = -20;

  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const rad = ((START_DEG + (END_DEG - START_DEG) * t) * Math.PI) / 180;
    const rootX = CX + R * Math.cos(rad);
    const rootY = CY + R * Math.sin(rad);
    const tipX = CX + (R + LEN) * Math.cos(rad);
    const tipY = CY + (R + LEN) * Math.sin(rad);
    return {
      d: `M${rootX.toFixed(1)} ${rootY.toFixed(1)} L${tipX.toFixed(1)} ${tipY.toFixed(1)}`,
    };
  });
}

// 사용자가 캐릭터 SVG 너비(160)에 맞춰 그린 예시(원본 viewBox 0 0 159 49,
// 좌상단을 캐릭터 SVG 맨 위에 맞춰 그림)를 그대로 가져오되, 159→160 너비
// 차이만큼만 비율 보정(× 160/159)했다. 위치는 원본 그대로(오프셋 없음) —
// 원본이 이미 캐릭터 SVG 맨 위에 맞춰져 있으므로 좌표를 임의로 옮기지 않는다.
const SLICKBACK_STRANDS: HairStrand[] = [
  { d: "M66.51 20.13C40.41 18.35 23.71 34.05 17.02 48.81" },
  { d: "M66.28 16.60C40.17 14.83 23.71 30.53 17.02 45.28" },
  { d: "M66.28 13.33C40.17 11.56 23.71 26.97 17.02 41.73" },
  { d: "M66.28 9.35C40.17 7.58 23.87 24.49 17.18 39.25" },
  { d: "M66.51 5.84C40.41 4.06 24.62 21.41 17.93 36.17" },
  { d: "M66.75 2.32C40.65 0.55 24.80 18.45 18.11 33.21" },
  { d: "M69.96 20.13C95.74 14.30 111.80 30.39 119.26 44.80" },
  { d: "M69.43 16.60C95.21 10.78 111.73 27.37 119.19 41.79" },
  { d: "M69.21 13.33C94.99 7.51 111.64 23.85 119.11 38.26" },
  { d: "M69.21 9.34C94.99 3.52 111.28 21.31 118.74 35.72" },
  { d: "M69.21 5.82C94.99 0.00 110.46 18.34 117.92 32.76" },
  { d: "M68.43 2.30C94.21 -3.52 108.75 15.27 116.21 29.69" },
];

export const HAIR_STYLES: HairStyleDef[] = [
  {
    id: "slickback",
    label: "올백머리",
    strands: SLICKBACK_STRANDS,
    strokeWidth: 3,
  },
  { id: "buzzcut", label: "기본", strands: tempFanStrands(24) },
];

export function getHairStyle(styleId: string): HairStyleDef {
  return HAIR_STYLES.find((s) => s.id === styleId) ?? HAIR_STYLES[0];
}

// 가닥 path 의 시작점(두피 쪽 끝) 좌표를 뽑는다 — 뽑기 인터랙션의 grab anchor.
export function parseStrandAnchor(d: string): { x: number; y: number } | null {
  const match = /^\s*M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/i.exec(d);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}
