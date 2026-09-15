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
import { BackButton } from "../components/common/BackButton";
import slingshot from "../assets/slingshot.jpg";
import { useMicDecibel } from "../hooks/useMicDecibel";

type Mode = "slingshot" | "hair" | "mic";

const TABS: { key: Mode; label: string }[] = [
  { key: "hair", label: "머리카락 뽑기" },
  { key: "slingshot", label: "새총 날리기" },
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

// 새총 모드일 때 캐릭터가 가만히 있지 않고 계속 이리저리 흔들리며 움직이게
// 한다 (조준을 어렵게 만들어 덜 밋밋하게, 당기고 날아가는 중엔 멈추지 않음).
// transform 은 이 훅 전용으로만 쓰고, flinch/dodge 피격 애니메이션은 안쪽
// (charWrapRef)에서 그대로 처리해 서로 덮어쓰지 않게 분리했다.
//
// 명중 여부는 "쏜 순간"이 아니라 돌이 날아가는 매 순간 실시간으로 확인한다
// (SlingshotStage 의 launch()). 다만 딱 맞은 순간만큼은 setPaused(true)로
// 잠깐(호출부에서 0.5초) 멈춰서 "명중 타격감"을 준다 — 멈춘 시간은 애니메이션
// 경과시간에서 빼서 재개할 때 위치가 튀지 않게 한다.
function useCharacterWander(active: boolean) {
  const wanderRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = wanderRef.current;
    if (!el) return;
    if (!active) {
      el.style.transform = "translate(0px, 0px)";
      return;
    }
    const AMP_X = 110; // px, 좌우로 움직이는 폭
    const AMP_Y = 40; // px, 위아래로 움직이는 폭
    const SPEED_X = 2; // rad/s
    const SPEED_Y = 1.4;
    let elapsed = 0; // 멈춘 시간은 빼고 누적한 경과시간(ms)
    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        elapsed += dt;
        const t = elapsed / 1000;
        const x = Math.sin(t * SPEED_X) * AMP_X;
        const y = Math.sin(t * SPEED_Y + 1.3) * AMP_Y; // 위상차 → 원 대신 리사주 곡선처럼 자연스럽게
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const setPaused = (paused: boolean) => {
    pausedRef.current = paused;
  };

  return [wanderRef, setPaused] as const;
}

export default function CharacterRoom() {
  const { id } = useParams<{ id: string }>();
  const character = useCharacterStore((s) =>
    id ? s.characters[id] : undefined,
  );
  const refillHair = useCharacterStore((s) => s.refillHair);
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("hair");
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [heldStrandIndex, setHeldStrandIndex] = useState<number | null>(null);
  const charWrapRef = useRef<HTMLDivElement>(null);
  const [wanderRef, setWanderPaused] = useCharacterWander(mode === "slingshot");
  const hitFreezeTimeoutRef = useRef<number>(undefined);
  const mic = useMicDecibel();

  useStatRecovery(id);

  // 마이크 모드를 벗어나면 진행 중인 측정을 즉시 정리한다
  const cancelMic = mic.cancel;
  useEffect(() => {
    if (mode !== "mic") cancelMic();
  }, [mode, cancelMic]);

  // 다른 공격 모드 탭으로 넘어가면 열려 있던 말풍선 입력창은 자동으로 닫는다
  // (페이지 자체를 벗어나는 경우는 컴포넌트가 언마운트되며 자연히 초기화됨)
  function handleModeChange(next: Mode) {
    setMode(next);
    setBubbleOpen(false);
  }

  // 새총이 딱 맞았을 때만 0.5초 캐릭터를 멈춰서 타격감을 준다
  function handleSlingshotHit() {
    setWanderPaused(true);
    window.clearTimeout(hitFreezeTimeoutRef.current);
    hitFreezeTimeoutRef.current = window.setTimeout(() => {
      setWanderPaused(false);
    }, 500);
  }

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
        <BackButton onClick={() => navigate("/characters")} />
        <h1>{character.name}</h1>
        <div className="right-button">
          <button
            onClick={() => navigate(`/characters/${id}/stats`)}
            aria-label="통계"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
          </button>
          <button
            onClick={() => navigate(`/characters/${id}/edit`)}
            aria-label="수정"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>

      <div className={`${styles.meterBar} ${meter.className}`}>
        <div className={styles.meterTrack}>
          <div
            className={styles.meterFill}
            style={{
              width: `${meter.value}%`,
              backgroundColor: `${mode === "slingshot" ? "#95e1d3" : mode === "hair" ? "#f38181" : "#fce38a"}`,
            }}
          />
        </div>
        <span className={styles.meterLabel}>{meter.label}</span>
      </div>

      <div className={styles.roomStage}>
        {/* 새총 모드에서는 말풍선 생성/수정/삭제 불가 — 이미 등록된 말풍선이
            있으면 아래 wanderRef 안에서 읽기 전용으로만 보여준다(캐릭터와
            같이 움직이도록) */}
        {mode !== "slingshot" &&
          (bubbleOpen ? (
            <SpeechBubbleInput
              existing={latestBubble?.text}
              onSubmit={(text) => {
                useCharacterStore.getState().addSpeechBubble(id, text);
                setBubbleOpen(false);
              }}
              onClose={() => setBubbleOpen(false)}
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
              className={styles.bubbleIcon}
              onClick={() => setBubbleOpen((v) => !v)}
              aria-label="말풍선"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 3 L16 3 A5 5 0 0 1 21 8 L21 12 A5 5 0 0 1 16 17 L12 17 L7 21 L8 17 A5 5 0 0 1 3 12 L3 8 A5 5 0 0 1 8 3 Z" />
                <path d="M12 10h.01" />
                <path d="M16 10h.01" />
                <path d="M8 10h.01" />
              </svg>
            </button>
          ))}

        <div ref={wanderRef} className={styles.characterWander}>
          {mode === "slingshot" && latestBubble?.text && (
            <div className={styles.speechBubbleBox}>{latestBubble.text}</div>
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
            {mode === "mic" && (
              <EarBloodOverlay hearing={character.stats.currentHearing} />
            )}
          </div>
          {/* characterWrap 은 width: fit-content 로 CharacterFigure 크기에
              딱 맞춰야 하는데(오버레이 좌표 정합성 때문), 안에 width:100% 인
              MicWaveform 을 같이 넣으면 그 100%가 fit-content 계산에 영향을
              줘서 characterWrap 자체가 넓어지고, 그러면 그 안의 오버레이(피
              연출 등)가 캐릭터 그림보다 옆으로 퍼져서 어긋나 보인다. 그래서
              MicWaveform 은 characterWrap 밖(characterWander 의 형제)으로
              뺐다 — 캐릭터와 함께 흔들릴 필요는 없고 폭만 전체로 넓으면 된다. */}
          {mode === "mic" && (
            <MicWaveform decibel={mic.decibel} listening={mic.listening} />
          )}
        </div>

        {mode === "slingshot" && (
          <SlingshotStage
            characterId={id}
            targetRef={charWrapRef}
            onHit={handleSlingshotHit}
          />
        )}
      </div>

      {mode === "hair" && hairPct === 0 && (
        <button
          className="primary-button refill-button"
          onClick={() => refillHair(id)}
        >
          머리카락 리필
        </button>
      )}
      {mode === "mic" && <ScreamButton characterId={id} mic={mic} />}

      <nav className={styles.attackTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={mode === t.key ? styles.activeTab : ""}
            onClick={() => handleModeChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// 소리지르기 모드에서 청력(currentHearing)이 깎일수록 귀에서 피가 흐르는
// 연출. CharacterFigure 와 같은 viewBox(0.5 -4.5 158 226) 위에 겹쳐서
// 그리므로 귀 좌표를 그대로 재사용할 수 있다 — 왼쪽 귀 bbox(x 3.2~20.2,
// y 52.5~80.0), 오른쪽 귀 bbox(x 118.0~134.2, y 48.4~77.5) 아랫부분
// 중앙에서 흘러내리게 했다. 직선 대신 살짝 구불거리는 얇은 stroke 선으로
// 그려서 흘러내리는 핏줄기처럼 보이게 한다.
const EAR_BLOOD_MAX_DRIP = 14; // px, 청력이 0이 됐을 때 흘러내리는 최대 길이
const EAR_BLOOD_MAX_WIDTH = 5.5; // px, 청력이 0이 됐을 때 핏줄기 최대 두께
const EAR_BLOOD_COLOR = "#ff0000";
const LEFT_EAR_DRIP_START = { x: 15, y: 65 };
const RIGHT_EAR_DRIP_START = { x: 123, y: 63 };

// (x, y) 에서 시작해서 length 만큼 살짝 구불거리며 흘러내리는 얇은 핏줄기 path.
function dripPath(x: number, y: number, length: number) {
  const wiggle = 1;
  const q1y = y + length * 0.33;
  const q2y = y + length * 0.66;
  const endY = y + length;
  return `M${x} ${y} Q${x + wiggle} ${y + length * 0.16} ${x} ${q1y} Q${x - wiggle} ${y + length * 0.5} ${x} ${q2y} Q${x + wiggle} ${y + length * 0.83} ${x} ${endY}`;
}

function EarBloodOverlay({ hearing }: { hearing: number }) {
  const lossPct = Math.max(0, Math.min(100, 100 - hearing));
  if (lossPct <= 0) return null;

  const drip = (lossPct / 100) * EAR_BLOOD_MAX_DRIP;
  const strokeWidth = (lossPct / 100) * EAR_BLOOD_MAX_WIDTH;
  const showDrop = drip > EAR_BLOOD_MAX_DRIP * 0.5;

  return (
    <svg
      className={styles.earBlood}
      viewBox="0.5 -4.5 158 226"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke={EAR_BLOOD_COLOR}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      >
        <path
          d={dripPath(LEFT_EAR_DRIP_START.x, LEFT_EAR_DRIP_START.y, drip)}
        />
        <path
          d={dripPath(RIGHT_EAR_DRIP_START.x, RIGHT_EAR_DRIP_START.y, drip)}
        />
      </g>
      <g fill={EAR_BLOOD_COLOR}>
        {showDrop && (
          <circle
            cx={LEFT_EAR_DRIP_START.x}
            cy={LEFT_EAR_DRIP_START.y + drip}
            r="1.8"
          />
        )}
        {showDrop && (
          <circle
            cx={RIGHT_EAR_DRIP_START.x}
            cy={RIGHT_EAR_DRIP_START.y + drip}
            r="1.8"
          />
        )}
      </g>
    </svg>
  );
}

// Siri 음성인식 느낌의 웨이브 — 겹쳐진 sine 곡선 3겹을 매 프레임 그려서
// 흐르는 듯한 모양을 만들고, 실제 진폭(높이)은 마이크 데시벨 점수에 맞춰
// 부드럽게(lerp) 따라가게 한다. 급격히 값이 튀어도 곡선이 뚝뚝 끊기지
// 않도록 목표 진폭(targetAmpRef)과 현재 진폭(ampRef)을 분리했다.
const WAVE_WIDTH = 320;
const WAVE_HEIGHT = 80;
const WAVE_MID = WAVE_HEIGHT / 2;
const WAVE_STEP = 8; // px, 곡선을 그릴 때의 x 샘플 간격
const WAVE_IDLE_AMP = 2; // px, 마이크가 꺼져 있을 때도 살짝 살아있는 느낌
const WAVE_MAX_AMP = 100; // px, decibel 100일 때 진폭
const WAVE_LAYERS = [
  { freq: 0.045, speed: 2.2, ampMul: 1, opacity: 0.9 },
  { freq: 0.035, speed: -1.6, ampMul: 0.7, opacity: 0.5 },
  { freq: 0.02, speed: 1.1, ampMul: 0.45, opacity: 0.3 },
];

function MicWaveform({
  decibel,
  listening,
}: {
  decibel: number;
  listening: boolean;
}) {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const ampRef = useRef(WAVE_IDLE_AMP);
  const targetAmpRef = useRef(WAVE_IDLE_AMP);

  useEffect(() => {
    targetAmpRef.current = listening
      ? WAVE_IDLE_AMP + (decibel / 100) * (WAVE_MAX_AMP - WAVE_IDLE_AMP)
      : WAVE_IDLE_AMP;
  }, [decibel, listening]);

  useEffect(() => {
    let raf = 0;
    let t = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      t += dt;
      ampRef.current +=
        (targetAmpRef.current - ampRef.current) * Math.min(1, dt * 6);

      for (let i = 0; i < WAVE_LAYERS.length; i++) {
        const path = pathRefs.current[i];
        if (!path) continue;
        const layer = WAVE_LAYERS[i];
        const amp = ampRef.current * layer.ampMul;
        let d = "";
        for (let x = 0; x <= WAVE_WIDTH; x += WAVE_STEP) {
          const y = WAVE_MID + Math.sin(x * layer.freq + t * layer.speed) * amp;
          d += (x === 0 ? "M" : "L") + x + " " + y.toFixed(1) + " ";
        }
        path.setAttribute("d", d);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.micWaveform}>
      <svg
        className={styles.micWaveformSvg}
        viewBox={`0 0 ${WAVE_WIDTH} ${WAVE_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {WAVE_LAYERS.map((layer, i) => (
          <path
            key={i}
            ref={(el) => {
              pathRefs.current[i] = el;
            }}
            fill="none"
            strokeOpacity={layer.opacity}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <span className={styles.dbMeterLabel}>
        {listening ? decibel : 0}
        <span className={styles.dbMeterUnit}>dB</span>
      </span>
    </div>
  );
}

const SCREAM_LISTEN_MS = 1500;

function ScreamButton({
  characterId,
  mic,
}: {
  characterId: string;
  mic: ReturnType<typeof useMicDecibel>;
}) {
  const [busy, setBusy] = useState(false);
  const hitWithScream = useCharacterStore((s) => s.hitWithScream);

  async function handlePress() {
    setBusy(true);
    const peak = await mic.measure(SCREAM_LISTEN_MS);
    if (peak != null) hitWithScream(characterId, peak);
    setBusy(false);
  }

  return (
    <>
      <Button onClick={handlePress} disabled={busy}>
        {mic.listening ? "···∙···∙·····" : "소리지르기"}
      </Button>
      {mic.error && <p className={styles.micError}>{mic.error}</p>}
    </>
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
// 빗나갔을 때 결과를 화면 밖까지 안 기다리고 빨리 보여주기 위한 값들.
// 한 번이라도 halfW*NEAR_MISS_ZONE_MULT 이내로 들어왔다가(=근처를 스쳤다가)
// 최근접 지점보다 PAST_PEAK_MARGIN px 만큼 더 멀어지면 그 자리에서 바로 확정.
const NEAR_MISS_ZONE_MULT = 3;
const PAST_PEAK_MARGIN = 10; // px

// 돌맹이를 나중에 이미지로 교체하려면:
//   import stoneUrl from "../assets/stone.svg"; (또는 .png)
// 후 아래 상수에 넣거나, <SlingshotStage stoneSrc={stoneUrl} /> 로 전달하면
// 자동으로 <image> 로 렌더된다. null 이면 기본 도형(회색 원).
const DEFAULT_STONE_SRC: string | null = null;

function SlingshotStage({
  characterId,
  targetRef,
  onHit,
  stoneSrc = DEFAULT_STONE_SRC ?? undefined,
}: {
  characterId: string;
  targetRef: RefObject<HTMLDivElement | null>;
  onHit: () => void; // 딱 명중했을 때(근접 실패 제외) 호출 — 타격감용 잠깐 멈춤 등에 사용
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
    // 조준 중(가이드 선) 미리보기 전용 — 방향/세기와, "지금 이 순간" 겨냥으로
    // 대략 어디까지 날아갈지의 길이만 계산한다. 실제 명중 여부는 여기서
    // 정하지 않는다 — 캐릭터가 계속 움직이므로 launch() 가 발사 후 매 프레임
    // 그 시점의 실시간 위치와 충돌 검사를 한다 (그래야 화면과 판정이 항상
    // 일치한다. 발사 순간에 한 번만 계산하면, 날아가는 동안 캐릭터가 움직여
    // "빗나간 것처럼 보이는데 맞았다고 표시" 되는 불일치가 생긴다).
    function trajectory(dx: number, dy: number) {
      const mag = Math.hypot(dx, dy) || 1;
      const power = Math.min(mag / MAX_PULL, 1);
      const dirx = -dx / mag;
      const diry = -dy / mag;

      const c = geom.char;
      const up = -diry; // 광선의 위쪽 성분. P0 위의 피사체를 겨냥하는 중이면 > 0
      let previewDist: number;
      if (up > 0.05) {
        // 당긴 힘 → 몸통(power 0) ~ 머리(power 1) 사이 높이까지의 길이
        const sBody = (geom.P0.y - c.bodyY) / up;
        const sHead = (geom.P0.y - c.headY) / up;
        previewDist = Math.max(0, sBody + (sHead - sBody) * power);
      } else {
        previewDist = mag * 4; // 위를 안 겨냥 → 화면 밖까지 길게
      }

      return { dirx, diry, mag, power, previewDist };
    }

    // launch() 전용: 지금(실시간) 캐릭터 위치 기준으로 (px,py) 가 명중권 안인지.
    // power 로 정해지는 높이(몸통~머리)는 발사 시점 그대로 고정하되, 그 높이
    // 자체(c.bodyY/c.headY)와 중심 x(c.x)는 매 프레임 최신값을 쓴다.
    function hitTestAt(px: number, py: number, power: number) {
      const c = geom.char;
      const bandY = c.bodyY + (c.headY - c.bodyY) * power;
      return Math.hypot(px - c.x, py - bandY);
    }

    function rel(r: DOMRect) {
      const o = svg!.getBoundingClientRect();
      return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
    }

    // 캐릭터(피사체)가 계속 움직이므로(useCharacterWander) geom.char 는
    // measure() 와 별개로 매 프레임 따로 갱신한다 — 조준 중에도, 가만히
    // 있을 때도 항상 "지금 실제로 있는 자리"를 겨냥하도록.
    function measureChar() {
      const tEl = targetRef.current;
      if (!tEl) return;
      const t = rel(tEl.getBoundingClientRect());
      geom.char = {
        x: t.x + t.w * 0.5,
        headY: t.y + t.h * HIT_HEAD_Y,
        bodyY: t.y + t.h * HIT_BODY_Y,
        halfW: t.w * HIT_HALF_W,
      };
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

      measureChar();
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

    // 발사 결과(명중/근접/빗나감)를 보여주고 원위치로 되돌린다.
    function resolveShot(
      ix: number,
      iy: number,
      isHit: boolean,
      isNearMiss: boolean,
      power: number,
    ) {
      if (isHit) {
        impactBurst(ix, iy);
        playReaction(styles.flinch);
        const dmg = Math.round(BASE_DMG + power * POWER_DMG);
        useCharacterStore.getState().hitWithSlingshot(characterId, dmg);
        floatText(ix, iy - 14, "-" + dmg);
        onHit();
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
    }

    // dx/dy: onUp 에서 넘긴 P0 기준 당김 변위. 방향(dirx,diry)·세기(power)는
    // 발사하는 순간 고정하되, 명중 여부는 돌이 날아가는 매 프레임 "지금"
    // 캐릭터 위치(hitTestAt, geom.char 는 계속 갱신됨)와 다시 검사한다 —
    // 캐릭터가 멈추지 않고 계속 움직이므로, 화면에 보이는 것과 판정이 늘 같게.
    function launch(dx: number, dy: number) {
      const { dirx, diry, power } = trajectory(dx, dy);
      busy = true;
      const speed = 340 + power * 520; // px/s

      let t0 = 0;
      let bestDist = Infinity; // 끝까지 명중 못 했을 때 "가장 가까웠던 지점"(아깝다용)
      let bestX = 0;
      let bestY = 0;

      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const travelled = (speed * (ts - t0)) / 1000;

        const px = geom.P0.x + dirx * travelled;
        const py = geom.P0.y + diry * travelled;
        moveStone(px, py);

        const dist = hitTestAt(px, py, power);
        if (dist < bestDist) {
          bestDist = dist;
          bestX = px;
          bestY = py;
        }
        if (dist <= geom.char.halfW) {
          resolveShot(px, py, true, false, power);
          return;
        }

        // 캐릭터 근처까지 왔다가(NEAR_MISS_ZONE 이내) 다시 멀어지기 시작하면,
        // 화면 밖까지 굳이 더 기다리지 않고 그 자리에서 바로 결과를 보여준다
        // — "아깝다!" 반응이 느리다는 피드백 반영. 애초에 근처에도 못 왔던
        // (완전히 빗나간) 샷은 그대로 화면 밖으로 날아가는 연출을 유지한다.
        const wasNear = bestDist <= geom.char.halfW * NEAR_MISS_ZONE_MULT;
        const pastPeak = dist > bestDist + PAST_PEAK_MARGIN;
        const o = svg!.getBoundingClientRect();
        const offscreen =
          px < -40 || px > o.width + 40 || py < -40 || py > o.height + 40;
        if ((wasNear && pastPeak) || offscreen) {
          const isNearMiss = bestDist <= geom.char.halfW * 1.7;
          resolveShot(bestX, bestY, false, isNearMiss, power);
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
        // 가이드 선: 실제 발사와 동일하게 P0 에서 같은 방향으로, 지금 겨냥 중인
        // 피사체 위치까지의 대략적인 길이만큼만 그린다(미리보기일 뿐 — 실제
        // 명중은 발사 후 매 프레임 실시간으로 다시 판정한다).
        const { dirx, diry, previewDist } = trajectory(dx, dy);
        attr(aim!, "x1", geom.P0.x);
        attr(aim!, "y1", geom.P0.y);
        attr(aim!, "x2", geom.P0.x + dirx * previewDist);
        attr(aim!, "y2", geom.P0.y + diry * previewDist);
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

    // 캐릭터가 계속 움직이는 동안(useCharacterWander) 조준선/명중판정이
    // 실시간으로 따라가도록 geom.char 만 따로 매 프레임 갱신
    let charRaf = 0;
    const trackChar = () => {
      measureChar();
      charRaf = requestAnimationFrame(trackChar);
    };
    charRaf = requestAnimationFrame(trackChar);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf0);
      cancelAnimationFrame(charRaf);
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
        src={slingshot}
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
// CharacterFigure 와 똑같은 viewBox(0.5 -4.5 158 226)를 줘서 두 svg 를 완전히
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
        floatText(anchor.x, anchor.y - 6, "아야!");
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
      viewBox="0.5 -4.5 158 226"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        ref={lineRef}
        className={styles.hairPullLine}
        fill={hair.color}
        style={{ color: hair.color }}
        stroke={hair.color}
      />
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
  onClose,
}: {
  existing?: string;
  onSubmit: (text: string) => void;
  onDelete?: () => void;
  onClose: () => void;
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
        <button onClick={onClose}>닫기</button>
        <button disabled={!text.trim()} onClick={() => onSubmit(text.trim())}>
          등록
        </button>
      </div>
    </div>
  );
}
