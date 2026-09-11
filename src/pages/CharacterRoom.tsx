import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import { hairRemainingPercent } from "../types/character";
import { getHairStyle, parseStrandAnchor } from "../constants/hairStyles";
import { CharacterFigure } from "../components/character/CharacterFigure";
import styles from "./CharacterRoom.module.scss";
import Button from "../components/common/Button";
import slingshotSvg from "../assets/Slingshot.svg";

type Mode = "slingshot" | "hair" | "mic";

const TABS: { key: Mode; label: string }[] = [
  { key: "slingshot", label: "새총 날리기" },
  { key: "hair", label: "머리카락 뽑기" },
  { key: "mic", label: "소리지르기" },
];

// 방에 있는 동안 시간 경과분만큼 HP / 청력 을 자동 회복시킨다.
// (진입 시 1회 + 60초 주기 + 탭 복귀/포커스 시)
function useStatRecovery(id: string | undefined) {
  const settleHpRecovery = useCharacterStore((s) => s.settleHpRecovery);
  const settleHearingRecovery = useCharacterStore(
    (s) => s.settleHearingRecovery,
  );
  const settleHairRegrow = useCharacterStore((s) => s.settleHairRegrow);
  useEffect(() => {
    if (!id) return;
    const tick = () => {
      settleHpRecovery(id);
      settleHearingRecovery(id);
      settleHairRegrow(id);
    };
    tick();
    const iv = window.setInterval(tick, 60000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [id, settleHpRecovery, settleHearingRecovery, settleHairRegrow]);
}

export default function CharacterRoom() {
  const { id } = useParams<{ id: string }>();
  const character = useCharacterStore((s) =>
    id ? s.characters[id] : undefined,
  );
  const refillHair = useCharacterStore((s) => s.refillHair);
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("slingshot");
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [heldStrandIndex, setHeldStrandIndex] = useState<number | null>(null);
  const charWrapRef = useRef<HTMLDivElement>(null);

  useStatRecovery(id);

  if (!id || !character) return <Navigate to="/characters" replace />;

  const hairPct = hairRemainingPercent(
    character,
    getHairStyle(character.config.hair.styleId).strands.length,
  );
  const latestBubble = character.speechBubbles.at(-1);

  const meter =
    mode === "slingshot"
      ? { label: "HP", value: character.stats.currentHp, className: "meter-hp" }
      : mode === "hair"
        ? { label: "머리카락", value: hairPct, className: "meter-hair" }
        : {
            label: "청력",
            value: character.stats.currentHearing,
            className: "meter-hearing",
          };

  return (
    <div className={"page " + styles.characterRoomPage}>
      <header className="header">
        <button onClick={() => navigate("/characters")}>◀</button>
        <h1>{character.name}</h1>
        <div className="right-button">
          <button
            onClick={() => navigate(`/characters/${id}/stats`)}
            aria-label="통계"
          >
            📊
          </button>
          <button
            onClick={() => navigate(`/characters/${id}/edit`)}
            aria-label="수정"
          >
            ⚙️
          </button>
        </div>
      </header>

      <div className={`${styles.meterBar} ${meter.className}`}>
        <div className={styles.meterTrack}>
          <div
            className={styles.meterFill}
            style={{ width: `${meter.value}%` }}
          />
        </div>
        <span className={styles.meterLabel}>{meter.label}</span>
      </div>

      <div className={styles.roomStage}>
        {mode === "mic" && <DecibelMeter />}

        {bubbleOpen ? (
          <SpeechBubbleInput
            existing={latestBubble?.text}
            onSubmit={(text) => {
              useCharacterStore.getState().addSpeechBubble(id, text);
              setBubbleOpen(false);
            }}
            onDelete={
              latestBubble
                ? () => {
                    useCharacterStore
                      .getState()
                      .removeSpeechBubble(id, latestBubble.id);
                    setBubbleOpen(false);
                  }
                : undefined
            }
          />
        ) : latestBubble?.text ? (
          <div
            className={styles.speechBubbleBox}
            onClick={() => setBubbleOpen((v) => !v)}
          >
            {latestBubble.text}
          </div>
        ) : (
          <button
            className="bubble-icon"
            onClick={() => setBubbleOpen((v) => !v)}
            aria-label="말풍선"
          >
            💬
          </button>
        )}

        <div ref={charWrapRef} className={styles.characterWrap}>
          <CharacterFigure
            {...character.config}
            heldStrandIndex={mode === "hair" ? heldStrandIndex : null}
            className={styles.character}
          />
          {mode === "hair" && (
            <HairPullStage
              characterId={id}
              targetRef={charWrapRef}
              onGrabChange={setHeldStrandIndex}
            />
          )}
        </div>

        {mode === "slingshot" && (
          <SlingshotStage characterId={id} targetRef={charWrapRef} />
        )}
      </div>

      {mode === "hair" && hairPct < 15 && (
        <button
          className="primary-button refill-button"
          onClick={() => refillHair(id)}
        >
          머리카락 리필
        </button>
      )}
      {mode === "mic" && <ScreamButton characterId={id} />}

      <nav className={styles.attackTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={mode === t.key ? styles.activeTab : ""}
            onClick={() => setMode(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function DecibelMeter() {
  // 실제 마이크 연동은 Web Audio API AnalyserNode로 별도 구현 필요 — 지금은 자리만
  return (
    <div className="db-meter">
      <span>100</span>
      <span>80</span>
      <span>60</span>
      <span>40</span>
      <span>20</span>
      <span>0</span>
      <span className="db-unit">(dB)</span>
    </div>
  );
}

function ScreamButton({ characterId }: { characterId: string }) {
  const [listening, setListening] = useState(false);
  const hitWithScream = useCharacterStore((s) => s.hitWithScream);

  function handlePress() {
    setListening(true);
    // TODO: getUserMedia + AnalyserNode로 실제 데시벨 측정해서 넘기기
    const mockDecibel = 60 + Math.random() * 40;
    setTimeout(() => {
      hitWithScream(characterId, mockDecibel);
      setListening(false);
    }, 800);
  }

  return (
    <Button onClick={handlePress} disabled={listening}>
      {listening ? "···∙···∙·····" : "소리지르기"}
    </Button>
  );
}

// 프레임 이미지(Slingshot.svg, viewBox 180x249) 크기 대비 비율(0~1).
// 실제 아트워크의 두 갈래 감김 부분 ≈ (20,28) / (162,29), 뷰박스 180x249 기준.
const FORK_L_RATIO = { x: 0.111, y: 0.135 }; // 왼쪽 갈래 (고무줄 고정점)
const FORK_R_RATIO = { x: 0.9, y: 0.13 }; // 오른쪽 갈래
const POUCH_RATIO = { x: 0.5, y: 0.17 }; // 안 당겼을 때 돌 위치 (갈래 사이)
// 명중 대상 = 피사체 몸(세로 띠). targetRef 박스(≈ CharacterFigure,
// viewBox 160x222) 좌상단 기준 비율.
// 약하게 던지면 HIT_BODY_Y(몸통) 높이에, 세게 던지면 HIT_HEAD_Y(머리)
// 높이에 맞는다. 그 사이는 당긴 힘에 비례해 선형 보간.
const HIT_HEAD_Y = 0.2; // 머리 (풀 당김이 닿는 높이)
const HIT_BODY_Y = 0.62; // 몸통/골반 (최소 당김이 닿는 높이)
const HIT_HALF_W = 0.3; // 좌우 명중 폭 (targetRef 폭 대비 반값)
const MAX_PULL = 70; // px, 최대 당김
const MIN_PULL = 10; // px, 이보다 덜 당기면 발사 안 됨
const STONE_R = 8; // 기본(도형) 돌 반지름
const STONE_SIZE = 20; // 이미지 돌로 교체 시 한 변 길이(px)
const GRAB_R = 24; // 투명 잡기 영역 반경 (드래그 편하게)
const BASE_DMG = 1; // 최소 데미지
const POWER_DMG = 2; // 풀 당김 시 추가 데미지

// 돌맹이를 나중에 이미지로 교체하려면:
//   import stoneUrl from "../assets/stone.svg"; (또는 .png)
// 후 아래 상수에 넣거나, <SlingshotStage stoneSrc={stoneUrl} /> 로 전달하면
// 자동으로 <image> 로 렌더된다. null 이면 기본 도형(회색 원).
const DEFAULT_STONE_SRC: string | null = null;

function SlingshotStage({
  characterId,
  targetRef,
  stoneSrc = DEFAULT_STONE_SRC ?? undefined,
}: {
  characterId: string;
  targetRef: RefObject<HTMLDivElement | null>;
  stoneSrc?: string;
}) {
  const frameRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const grabRef = useRef<SVGGElement>(null);
  const bandLRef = useRef<SVGLineElement>(null);
  const bandRRef = useRef<SVGLineElement>(null);
  const aimRef = useRef<SVGLineElement>(null);
  const fxRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const grab = grabRef.current;
    const bandL = bandLRef.current;
    const bandR = bandRRef.current;
    const aim = aimRef.current;
    const fx = fxRef.current;
    const frame = frameRef.current;
    if (!svg || !grab || !bandL || !bandR || !aim || !fx || !frame) return;

    const NS = "http://www.w3.org/2000/svg";
    const attr = (el: Element, n: string, v: number | string) =>
      el.setAttribute(n, String(v));

    // 씬 좌표 = 오버레이 SVG 로컬 px (viewBox 없이 1:1)
    const geom = {
      P0: { x: 0, y: 0 },
      forkL: { x: 0, y: 0 },
      forkR: { x: 0, y: 0 },
      char: { x: 0, headY: 0, bodyY: 0, halfW: 1 },
    };
    const cur = { x: 0, y: 0 }; // 돌의 현재 위치
    let busy = false; // 발사 진행 중
    let dragging = false;
    let raf = 0;

    // P0 기준 당김 변위(dx,dy) → 발사 방향 단위벡터 + 세기 + 궤적 판정.
    // 가이드 선과 실제 발사가 시작점(P0)·기울기·도달 거리까지 똑같이
    // 나오도록 여기 한 곳에서만 계산한다.
    function trajectory(dx: number, dy: number) {
      const mag = Math.hypot(dx, dy) || 1;
      const power = Math.min(mag / MAX_PULL, 1);
      const dirx = -dx / mag;
      const diry = -dy / mag;

      const c = geom.char;
      const up = -diry; // 광선의 위쪽 성분. P0 위의 피사체를 맞히려면 > 0

      let isHit = false;
      let isNearMiss = false;
      let stopDist: number;

      if (up > 0.05) {
        // 당긴 힘 → 몸통(power 0) ~ 머리(power 1) 사이 높이에서 멈춘다.
        const sBody = (geom.P0.y - c.bodyY) / up; // 몸통 높이까지 광선 거리
        const sHead = (geom.P0.y - c.headY) / up; // 머리 높이까지 광선 거리
        stopDist = Math.max(0, sBody + (sHead - sBody) * power);

        const ix = geom.P0.x + dirx * stopDist; // 멈추는 지점의 x
        const off = Math.abs(ix - c.x); // 몸 중심선에서 벗어난 정도
        isHit = off <= c.halfW;
        isNearMiss = !isHit && off <= c.halfW * 1.7;
      } else {
        stopDist = mag * 4; // 위를 안 겨냥 → 빗나가 화면 밖으로
      }

      return { dirx, diry, mag, power, isHit, isNearMiss, stopDist };
    }

    function rel(r: DOMRect) {
      const o = svg!.getBoundingClientRect();
      return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
    }

    function measure() {
      const f = rel(frame!.getBoundingClientRect());
      if (f.w < 10 || f.h < 10) return; // 아직 레이아웃 전
      geom.forkL = {
        x: f.x + FORK_L_RATIO.x * f.w,
        y: f.y + FORK_L_RATIO.y * f.h,
      };
      geom.forkR = {
        x: f.x + FORK_R_RATIO.x * f.w,
        y: f.y + FORK_R_RATIO.y * f.h,
      };
      geom.P0 = { x: f.x + POUCH_RATIO.x * f.w, y: f.y + POUCH_RATIO.y * f.h };

      const tEl = targetRef.current;
      if (tEl) {
        const t = rel(tEl.getBoundingClientRect());
        geom.char = {
          x: t.x + t.w * 0.5,
          headY: t.y + t.h * HIT_HEAD_Y,
          bodyY: t.y + t.h * HIT_BODY_Y,
          halfW: t.w * HIT_HALF_W,
        };
      }
      if (!busy && !dragging) rest();
    }

    function moveStone(x: number, y: number) {
      cur.x = x;
      cur.y = y;
      grab!.setAttribute("transform", `translate(${x} ${y})`);
    }
    // 고무줄 두 가닥 + 돌을 함께 이동 (당기는 중)
    function setPouch(x: number, y: number) {
      moveStone(x, y);
      attr(bandL!, "x2", x);
      attr(bandL!, "y2", y);
      attr(bandR!, "x2", x);
      attr(bandR!, "y2", y);
    }
    // 놓는 즉시 고무줄만 원위치로 스냅
    function snapBands() {
      attr(bandL!, "x2", geom.P0.x);
      attr(bandL!, "y2", geom.P0.y);
      attr(bandR!, "x2", geom.P0.x);
      attr(bandR!, "y2", geom.P0.y);
    }
    function rest() {
      attr(bandL!, "x1", geom.forkL.x);
      attr(bandL!, "y1", geom.forkL.y);
      attr(bandR!, "x1", geom.forkR.x);
      attr(bandR!, "y1", geom.forkR.y);
      setPouch(geom.P0.x, geom.P0.y);
      aim!.style.opacity = "0";
    }

    function floatText(x: number, y: number, msg: string) {
      const t = document.createElementNS(NS, "text");
      attr(t, "x", x);
      attr(t, "y", y);
      t.textContent = msg;
      t.setAttribute("class", styles.floatText);
      fx!.appendChild(t);
      window.setTimeout(() => t.remove(), 850);
    }

    function impactBurst(x: number, y: number) {
      for (let i = 0; i < 6; i++) {
        const ang = ((Math.PI * 2) / 6) * i;
        const line = document.createElementNS(NS, "line");
        line.setAttribute("class", styles.burst);
        attr(line, "x1", x);
        attr(line, "y1", y);
        attr(line, "x2", x);
        attr(line, "y2", y);
        fx!.appendChild(line);
        const tx = x + Math.cos(ang) * 18;
        const ty = y + Math.sin(ang) * 18;
        let t0 = 0;
        const step = (ts: number) => {
          if (!t0) t0 = ts;
          const p = Math.min((ts - t0) / 260, 1);
          attr(line, "x2", x + (tx - x) * p);
          attr(line, "y2", y + (ty - y) * p);
          attr(line, "opacity", 1 - p);
          if (p < 1) requestAnimationFrame(step);
          else line.remove();
        };
        requestAnimationFrame(step);
      }
    }

    function playReaction(cls: string) {
      const el = targetRef.current;
      if (!el) return;
      el.classList.remove(styles.flinch, styles.dodge);
      void el.offsetWidth; // 리플로우 강제 → 애니메이션 재시작
      el.classList.add(cls);
    }

    // dx/dy: onUp 에서 넘긴 P0 기준 당김 변위. trajectory 로 가이드 선과
    // 완전히 동일한 방향·도달 지점을 산출한다.
    function launch(dx: number, dy: number) {
      const { dirx, diry, power, isHit, isNearMiss, stopDist } =
        trajectory(dx, dy);
      busy = true;
      const speed = 340 + power * 520; // px/s

      let t0 = 0;
      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const travelled = (speed * (ts - t0)) / 1000;

        // stopDist = 사거리/명중 지점. 여기 도달하면 돌이 멈춘다.
        if (travelled >= stopDist) {
          const ix = geom.P0.x + dirx * stopDist;
          const iy = geom.P0.y + diry * stopDist;
          moveStone(ix, iy);
          if (isHit) {
            impactBurst(ix, iy);
            playReaction(styles.flinch);
            const dmg = Math.round(BASE_DMG + power * POWER_DMG);
            useCharacterStore.getState().hitWithSlingshot(characterId, dmg);
            floatText(ix, iy - 14, "-" + dmg);
          } else if (isNearMiss) {
            playReaction(styles.dodge);
            floatText(ix, iy - 30, "아깝다!");
          }
          grab!.style.opacity = "0";
          window.setTimeout(
            () => {
              grab!.style.opacity = "1";
              rest();
              busy = false;
            },
            isHit ? 600 : 300,
          );
          return;
        }

        const px = geom.P0.x + dirx * travelled;
        const py = geom.P0.y + diry * travelled;
        moveStone(px, py);

        const o = svg!.getBoundingClientRect();
        if (px < -40 || px > o.width + 40 || py < -40 || py > o.height + 40) {
          grab!.style.opacity = "0";
          window.setTimeout(() => {
            grab!.style.opacity = "1";
            rest();
            busy = false;
          }, 300);
          return;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    function pointFromEvent(e: PointerEvent) {
      const o = svg!.getBoundingClientRect();
      return { x: e.clientX - o.left, y: e.clientY - o.top };
    }

    function currentHp() {
      return (
        useCharacterStore.getState().characters[characterId]?.stats.currentHp ??
        0
      );
    }

    function onDown(e: PointerEvent) {
      if (busy || currentHp() <= 0) return; // 발사 중이거나 이미 기절이면 무시
      e.preventDefault();
      grab!.setPointerCapture(e.pointerId);
      dragging = true;
      measure();
      setPouch(geom.P0.x, geom.P0.y); // 갱신된 기준점으로 정렬
      aim!.style.opacity = "1";

      const onMove = (ev: PointerEvent) => {
        if (!dragging) return;
        const p = pointFromEvent(ev);
        let dx = p.x - geom.P0.x;
        let dy = p.y - geom.P0.y;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_PULL) {
          dx = (dx / dist) * MAX_PULL;
          dy = (dy / dist) * MAX_PULL;
        }
        const cx = geom.P0.x + dx;
        const cy = geom.P0.y + dy;
        setPouch(cx, cy);
        // 가이드 선: 실제 발사와 동일하게 P0 에서 같은 방향으로,
        // 돌이 멈추는(피사체에 맞는) 지점까지만 그린다.
        const { dirx, diry, stopDist } = trajectory(dx, dy);
        attr(aim!, "x1", geom.P0.x);
        attr(aim!, "y1", geom.P0.y);
        attr(aim!, "x2", geom.P0.x + dirx * stopDist);
        attr(aim!, "y2", geom.P0.y + diry * stopDist);
      };
      const onUp = () => {
        dragging = false;
        grab!.removeEventListener("pointermove", onMove);
        grab!.removeEventListener("pointerup", onUp);
        grab!.removeEventListener("pointercancel", onUp);
        aim!.style.opacity = "0";
        const dx = cur.x - geom.P0.x;
        const dy = cur.y - geom.P0.y;
        if (Math.hypot(dx, dy) < MIN_PULL) {
          rest();
          return;
        }
        snapBands();
        launch(dx, dy);
      };
      grab!.addEventListener("pointermove", onMove);
      grab!.addEventListener("pointerup", onUp);
      grab!.addEventListener("pointercancel", onUp);
    }

    grab.addEventListener("pointerdown", onDown);
    measure();
    const raf0 = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => measure());
    ro.observe(svg);
    frame.addEventListener("load", measure);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf0);
      ro.disconnect();
      frame.removeEventListener("load", measure);
      grab.removeEventListener("pointerdown", onDown);
      targetRef.current?.classList.remove(styles.flinch, styles.dodge);
    };
  }, [characterId, targetRef]);

  return (
    <>
      <img
        ref={frameRef}
        src={slingshotSvg}
        alt="새총"
        className={styles.slingshotFrame}
        draggable={false}
      />
      <svg
        ref={svgRef}
        className={styles.slingshotOverlay}
        xmlns="http://www.w3.org/2000/svg"
      >
        <line ref={bandLRef} className={styles.band} />
        <line ref={bandRRef} className={styles.band} />
        <line ref={aimRef} className={styles.aimLine} />
        <g ref={fxRef} />
        <g ref={grabRef} className={styles.projectile}>
          <circle className={styles.grabArea} r={GRAB_R} />
          {stoneSrc ? (
            <image
              className={styles.stone}
              href={stoneSrc}
              x={-STONE_SIZE / 2}
              y={-STONE_SIZE / 2}
              width={STONE_SIZE}
              height={STONE_SIZE}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <circle className={styles.stone} r={STONE_R} />
          )}
        </g>
      </svg>
    </>
  );
}

const HAIR_PULL_THRESHOLD = 22; // 이만큼 당겨야 뽑힘 확정 (모자라면 스냅백)

// 이전 버전의 진짜 문제: 가닥의 "두피 쪽 시작점"에서만 반경 몇 px 안쪽으로
// 클릭해야 잡히는 방식이었다 — 정작 눈에 보이는 머리카락은 그 시작점에서
// 한참 떨어진 곳까지 곡선으로 뻗어 있어서, 보이는 머리카락을 클릭해도
// 대부분 반경 밖이라 아무것도 안 잡혔다.
//
// 그래서 이번엔 좌표를 화면 px 로 직접 변환하지 않고, 오버레이 svg 자체에
// CharacterFigure 와 똑같은 viewBox(0 0 160 222)를 줘서 두 svg 를 완전히
// 겹쳐지게 만들었다. 그러면 가닥의 원본 path(d) 를 좌표 변환 없이 그대로
// 재사용해서 "보이는 곡선 그 자체"를 히트 영역으로 쓸 수 있다
// (fill 없이 굵은 투명 stroke + pointer-events: stroke).
function HairPullStage({
  characterId,
  targetRef,
  onGrabChange,
}: {
  characterId: string;
  targetRef: RefObject<HTMLDivElement | null>;
  // 지금 당기는 중인 가닥의 index (놓으면 null) — CharacterFigure 가 그 가닥을
  // 잠깐 안 그리게(뽑는 동안 안 보이게) 하는 데 쓴다.
  onGrabChange: (index: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const fxRef = useRef<SVGGElement>(null);

  const hair = useCharacterStore((s) => s.characters[characterId]?.config.hair);

  // 화면(클라이언트) 좌표 → 이 svg 의 로컬(viewBox) 좌표. getScreenCTM 을 쓰면
  // 실제 렌더링 크기/스케일과 무관하게 항상 정확하다 (수동 비율 계산 불필요).
  function toLocal(svg: SVGSVGElement, clientX: number, clientY: number) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function floatText(x: number, y: number, msg: string) {
    const fx = fxRef.current;
    if (!fx) return;
    const NS = "http://www.w3.org/2000/svg";
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", String(x));
    t.setAttribute("y", String(y));
    t.textContent = msg;
    t.setAttribute("class", styles.floatText);
    fx.appendChild(t);
    window.setTimeout(() => t.remove(), 850);
  }

  // 새총 playReaction 과 동일한 흔들림 효과 재사용 (같은 targetRef, 같은 클래스)
  function playShake() {
    const el = targetRef.current;
    if (!el) return;
    el.classList.remove(styles.flinch);
    void el.offsetWidth; // 리플로우 강제 → 애니메이션 재시작
    el.classList.add(styles.flinch);
  }

  function handleGrab(
    e: ReactPointerEvent<SVGPathElement>,
    index: number,
    anchor: { x: number; y: number },
  ) {
    const svg = svgRef.current;
    const line = lineRef.current;
    if (!svg || !line) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onGrabChange(index); // 잡고 있는 동안 이 가닥은 CharacterFigure 에서 숨김

    line.style.opacity = "1";
    line.setAttribute("x1", String(anchor.x));
    line.setAttribute("y1", String(anchor.y));
    line.setAttribute("x2", String(anchor.x));
    line.setAttribute("y2", String(anchor.y));

    const onMove = (ev: PointerEvent) => {
      const p = toLocal(svg, ev.clientX, ev.clientY);
      line.setAttribute("x2", String(p.x));
      line.setAttribute("y2", String(p.y));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      line.style.opacity = "0";
      onGrabChange(null); // 성공(영구 삭제)이든 스냅백이든 임시 숨김은 해제

      const p = toLocal(svg, ev.clientX, ev.clientY);
      const dx = p.x - anchor.x;
      const dy = p.y - anchor.y;
      if (Math.hypot(dx, dy) >= HAIR_PULL_THRESHOLD) {
        useCharacterStore.getState().pluckStrand(characterId, index);
        playShake();
        floatText(anchor.x, anchor.y - 6, "쏙!");
      }
      // 못 미치면 아무 상태 변화 없이 그냥 선만 사라짐(스냅백)
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  if (!hair) return null;
  const style = getHairStyle(hair.styleId);
  const removed = new Set(hair.removedStrands.map((r) => r.index));

  return (
    <svg
      ref={svgRef}
      className={styles.hairPullOverlay}
      viewBox="0 0 160 222"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line ref={lineRef} className={styles.hairPullLine} />
      <g ref={fxRef} />
      {style.strands.map((strand, index) => {
        if (removed.has(index)) return null;
        const anchor = parseStrandAnchor(strand.d);
        if (!anchor) return null;
        return (
          <path
            key={index}
            d={strand.d}
            className={styles.hairHitPath}
            onPointerDown={(e) => handleGrab(e, index, anchor)}
          />
        );
      })}
    </svg>
  );
}

function SpeechBubbleInput({
  existing,
  onSubmit,
  onDelete,
}: {
  existing?: string;
  onSubmit: (text: string) => void;
  onDelete?: () => void;
}) {
  const [text, setText] = useState(existing ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  return (
    <div className={styles.speechBubbleBox}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="오늘 그 사람이 한 말"
        maxLength={40}
        rows={1}
        autoFocus={true}
      />
      <div className={styles.bubbleButtons}>
        {onDelete && (
          <button className={styles.delete} onClick={onDelete}>
            삭제
          </button>
        )}
        <button onClick={() => onSubmit(text.trim())}>등록</button>
      </div>
    </div>
  );
}
