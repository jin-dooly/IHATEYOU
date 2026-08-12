import { useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import { hairRemainingPercent } from "../types/character";
import { CharacterFigure } from "../components/character/CharacterFigure";

type Mode = "slingshot" | "hair" | "mic";

const TABS: { key: Mode; label: string }[] = [
  { key: "slingshot", label: "새총 날리기" },
  { key: "hair", label: "머리카락 뽑기" },
  { key: "mic", label: "소리지르기" },
];

export default function CharacterRoom() {
  const { id } = useParams<{ id: string }>();
  const character = useCharacterStore((s) =>
    id ? s.characters[id] : undefined,
  );
  const refillHair = useCharacterStore((s) => s.refillHair);
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("slingshot");
  const [bubbleOpen, setBubbleOpen] = useState(false);

  if (!id || !character) return <Navigate to="/characters" replace />;

  const hairPct = hairRemainingPercent(character);
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
    <div className="page room">
      <header className="room-header">
        <button onClick={() => navigate("/characters")}>←</button>
        <span>{character.name}</span>
        <button
          onClick={() => navigate(`/characters/${id}/stats`)}
          aria-label="통계"
        >
          📊
        </button>
      </header>

      <div className={`meter-bar ${meter.className}`}>
        <span className="meter-label">{meter.label}</span>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${meter.value}%` }} />
        </div>
      </div>

      <div className="room-stage">
        {mode === "mic" && <DecibelMeter />}

        <button
          className="bubble-icon"
          onClick={() => setBubbleOpen((v) => !v)}
          aria-label="말풍선"
        >
          💬
        </button>
        {bubbleOpen && (
          <SpeechBubbleInput
            existing={latestBubble?.text}
            onSubmit={(text) => {
              useCharacterStore.getState().addSpeechBubble(id, text);
              setBubbleOpen(false);
            }}
          />
        )}
        {!bubbleOpen && latestBubble && (
          <div className="speech-bubble">{latestBubble.text}</div>
        )}

        <CharacterFigure {...character.config} />
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
      {mode === "slingshot" && <SlingshotStage characterId={id} />}

      <nav className="attack-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={mode === t.key ? "tab active" : "tab"}
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
    <button
      className="primary-button"
      onClick={handlePress}
      disabled={listening}
    >
      {listening ? "···∙···∙·····" : "소리지르기"}
    </button>
  );
}

function SlingshotStage({ characterId }: { characterId: string }) {
  const hitWithSlingshot = useCharacterStore((s) => s.hitWithSlingshot);
  // 지난번 만든 새총 데모의 드래그/발사 로직을 여기로 옮기고,
  // 명중 시 hitWithSlingshot(characterId, damage) 호출하면 됨
  return <div className="slingshot-stage" />;
}

function SpeechBubbleInput({
  existing,
  onSubmit,
}: {
  existing?: string;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState(existing ?? "");
  return (
    <div className="speech-bubble-input">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="오늘 그 사람이 한 말"
      />
      <button onClick={() => text.trim() && onSubmit(text.trim())}>등록</button>
    </div>
  );
}
