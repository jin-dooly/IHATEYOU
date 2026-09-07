import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import { hairRemainingPercent } from "../types/character";
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
  useEffect(() => {
    if (!id) return;
    const tick = () => {
      settleHpRecovery(id);
      settleHearingRecovery(id);
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
  }, [id, settleHpRecovery, settleHearingRecovery]);
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
  const charWrapRef = useRef<HTMLDivElement>(null);

  useStatRecovery(id);

  if (!id || !character) return <Navigate to="/characters" replace />;

  const hairPct = hairRemainingPercent(character);
  const latestBubble = character.speechBubbles.at(-1);
  console.log("latestBubble", latestBubble);

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
          <CharacterFigure {...character.config} className={styles.character} />
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
const FORK_L_RATIO = { x: 0.111, y: 0.112 }; // 왼쪽 갈래 (고무줄 고정점)
const FORK_R_RATIO = { x: 0.9, y: 0.116 }; // 오른쪽 갈래
const POUCH_RATIO = { x: 0.5, y: 0.17 }; // 안 당겼을 때 돌 위치 (갈래 사이)
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
      char: { x: 0, y: 0, r: 1 },
    };
    const cur = { x: 0, y: 0 }; // 돌의 현재 위치
    let busy = false; // 발사 진행 중
    let dragging = false;
    let raf = 0;

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
          x: t.x + t.w / 2,
          y: t.y + t.h / 2,
          r: (Math.min(t.w, t.h) / 2) * 0.55,
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

    function launch(dx: number, dy: number, mag: number) {
      busy = true;
      const dirx = -dx / mag;
      const diry = -dy / mag;
      const power = Math.min(mag / MAX_PULL, 1);
      const speed = 340 + power * 520; // px/s

      const toCx = geom.char.x - geom.P0.x;
      const toCy = geom.char.y - geom.P0.y;
      const along = toCx * dirx + toCy * diry;
      const closeX = geom.P0.x + dirx * along;
      const closeY = geom.P0.y + diry * along;
      const distToChar = Math.hypot(geom.char.x - closeX, geom.char.y - closeY);
      const isHit = along > 0 && distToChar <= geom.char.r;
      const isNearMiss = !isHit && along > 0 && distToChar <= geom.char.r * 1.8;

      let impactDist = 0;
      if (isHit) {
        const b = along;
        const c = toCx * toCx + toCy * toCy - geom.char.r * geom.char.r;
        impactDist = b - Math.sqrt(Math.max(0, b * b - c));
      }

      let t0 = 0;
      let dodged = false;
      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const travelled = (speed * (ts - t0)) / 1000;

        if (isHit && travelled >= impactDist) {
          const ix = geom.P0.x + dirx * impactDist;
          const iy = geom.P0.y + diry * impactDist;
          moveStone(ix, iy);
          impactBurst(ix, iy);
          playReaction(styles.flinch);
          const dmg = Math.round(BASE_DMG + power * POWER_DMG);
          useCharacterStore.getState().hitWithSlingshot(characterId, dmg);
          floatText(ix, iy - 14, "-" + dmg);
          grab!.style.opacity = "0";
          window.setTimeout(() => {
            grab!.style.opacity = "1";
            rest();
            busy = false;
          }, 600);
          return;
        }

        const px = geom.P0.x + dirx * travelled;
        const py = geom.P0.y + diry * travelled;
        moveStone(px, py);

        if (isNearMiss && !dodged && travelled >= along) {
          dodged = true;
          playReaction(styles.dodge);
          floatText(geom.char.x, geom.char.y - 60, "아깝다!");
        }

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
        attr(aim!, "x1", cx);
        attr(aim!, "y1", cy);
        attr(aim!, "x2", geom.P0.x - dx * 2.4);
        attr(aim!, "y2", geom.P0.y - dy * 2.4);
      };
      const onUp = () => {
        dragging = false;
        grab!.removeEventListener("pointermove", onMove);
        grab!.removeEventListener("pointerup", onUp);
        grab!.removeEventListener("pointercancel", onUp);
        aim!.style.opacity = "0";
        const dx = cur.x - geom.P0.x;
        const dy = cur.y - geom.P0.y;
        const mag = Math.hypot(dx, dy);
        if (mag < MIN_PULL) {
          rest();
          return;
        }
        snapBands();
        launch(dx, dy, mag);
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
