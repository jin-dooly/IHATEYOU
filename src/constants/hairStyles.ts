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

// 사용자가 캐릭터 SVG 너비(160)에 맞춰 그린 예시(원본 viewBox 0 0 158 49,
// 좌상단을 캐릭터 SVG 맨 위에 맞춰 그림)를 그대로 가져오되, 158→160 너비
// 차이만큼만 비율 보정(× 160/158)했다. 위치는 원본 그대로(오프셋 없음) —
// 원본이 이미 캐릭터 SVG 맨 위에 맞춰져 있으므로 좌표를 임의로 옮기지 않는다.
const SLICKBACK_STRANDS: HairStrand[] = [
  { d: "M66.77 21.05C40.44 21.68 24.02 33.72 17.29 48.57" },
  { d: "M66.67 17C40.35 17.63 23.95 30.69 17.21 45.54" },
  { d: "M66.58 13.45C40.26 14.09 23.86 27.14 17.13 41.99" },
  { d: "M66.49 9.4C40.16 10.04 24.86 25.09 18.13 39.94" },
  { d: "M66.4 5.86C40.08 6.49 24.77 21.55 18.04 36.4" },
  { d: "M66.32 2.32C39.99 2.95 24.69 18.01 17.96 32.86" },
  { d: "M69.1 20.48C95.65 18.9 112.51 30.58 120.02 45.09" },
  { d: "M68.87 16.54C95.41 14.97 112.43 27.54 119.95 42.05" },
  { d: "M68.66 13.1C95.21 11.52 112.35 24 119.86 38.51" },
  { d: "M68.43 9.17C94.98 7.59 111.24 22 118.76 36.51" },
  { d: "M68.22 5.72C94.77 4.15 111.16 18.46 118.67 32.96" },
  { d: "M68.02 2.28C94.57 0.71 111.07 14.91 118.58 29.42" },
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
