// pages/CharacterCreate.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import type { CharacterConfig } from "../types/character";
import { FaceCanvas } from "../components/character/FaceCanvas";
import { CharacterConfigPicker } from "../components/character/CharacterConfigPicker";
import { CharacterFigure } from "../components/character/CharacterFigure";
import styles from "./CharacterCreate.module.scss";

type Step = "face" | "customize";

const DEFAULT_CONFIG: CharacterConfig = {
  headShape: "round",
  bodyColor: "#ffffff",
  faceImage: "",
  hair: { styleId: "buzzcut", color: "#000", removedStrands: [] },
};

export default function CharacterCreate() {
  const [step, setStep] = useState<Step>("customize");
  const [name, setName] = useState("");
  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CONFIG);
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const navigate = useNavigate();

  function handleCustomDone() {
    setStep("face");
  }

  function handleComplete(faceImage: string) {
    const id = createCharacter(name.trim() || "이름 없음", {
      ...config,
      faceImage,
    });
    navigate(`/characters/${id}/room`);
  }

  return (
    <div className={"page " + styles.page}>
      <div className="step-header">
        {step === "customize" && (
          <button onClick={() => setStep("face")}>←</button>
        )}
        <span>{step === "customize" ? "1 / 2" : "2 / 2"}</span>
      </div>

      {step === "customize" && (
        <div className="customize-panel">
          {/* 이름 설정 영역 */}
          <div className="charater-name">
            <input
              className="name-input"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="character-preview">
            <CharacterFigure {...config} />
          </div>
          <CharacterConfigPicker
            bodyColor={config.bodyColor}
            onBodyColorChange={(bodyColor) =>
              setConfig((p) => ({ ...p, bodyColor }))
            }
            hairColor={config.hair.color}
            onHairColorChange={(color) =>
              setConfig((p) => ({ ...p, hair: { ...p.hair, color } }))
            }
            headShape={config.headShape}
            onHeadShapeChange={(headShape) =>
              setConfig((p) => ({ ...p, headShape }))
            }
          />
          <button
            className="primary-button"
            onClick={handleCustomDone}
            disabled={!name.trim()}
          >
            완료
          </button>
        </div>
      )}

      {step === "face" && <FaceCanvas onNext={handleComplete} />}
    </div>
  );
}
