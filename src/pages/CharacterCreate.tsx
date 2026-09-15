// pages/CharacterCreate.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import type { CharacterConfig } from "../types/character";
import { FaceCanvas } from "../components/character/FaceCanvas";
import { CharacterConfigPicker } from "../components/character/CharacterConfigPicker";
import { CharacterFigure } from "../components/character/CharacterFigure";
import styles from "./CharacterCreate.module.scss";
import Button from "../components/common/Button";
import { BackButton } from "../components/common/BackButton";

type Step = "face" | "customize";

const DEFAULT_CONFIG: CharacterConfig = {
  headShape: "round",
  bodyColor: "#ffffff",
  faceImage: "",
  hair: { styleId: "layered", color: "#000", removedStrands: [] },
};

export default function CharacterCreate() {
  const [step, setStep] = useState<Step>("customize");
  const [name, setName] = useState("");
  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CONFIG);
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const navigate = useNavigate();

  function handleBack() {
    if (step === "customize") {
      navigate(-1);
    } else {
      setStep("customize");
    }
  }

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
      <div className={"header " + styles.header}>
        <BackButton onClick={handleBack} />
        <h1>캐릭터 생성 ({step === "customize" ? "1/2" : "2/2"})</h1>
      </div>

      {step === "customize" && (
        <div className={styles.customizePanel}>
          {/* 이름 설정 영역 */}
          <div className={styles.charaterName}>
            <input
              className="name-input"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
            />
          </div>

          <div className={styles.characterPreview}>
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
            hairStyleId={config.hair.styleId}
            onHairStyleChange={(styleId) =>
              setConfig((p) => ({
                ...p,
                hair: { ...p.hair, styleId, removedStrands: [] },
              }))
            }
          />
          <Button
            className={styles.nextButton}
            onClick={handleCustomDone}
            disabled={!name.trim()}
          >
            다음
          </Button>
        </div>
      )}

      {step === "face" && <FaceCanvas onNext={handleComplete} />}
    </div>
  );
}
