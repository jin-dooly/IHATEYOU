// pages/CharacterEdit.tsx
import { useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import type { CharacterConfig } from "../types/character";
import { FaceCanvas } from "../components/character/FaceCanvas";
import { CharacterConfigPicker } from "../components/character/CharacterConfigPicker";
import { CharacterFigure } from "../components/character/CharacterFigure";
import Button from "../components/common/Button";
import styles from "./CharacterEdit.module.scss";

type Step = "customize" | "face";

const FALLBACK_CONFIG: CharacterConfig = {
  headShape: "round",
  bodyColor: "#ffffff",
  faceImage: "",
  hair: { styleId: "buzzcut", color: "#000", removedStrands: [] },
};

export default function CharacterEdit() {
  const { id } = useParams<{ id: string }>();
  const character = useCharacterStore((s) =>
    id ? s.characters[id] : undefined,
  );
  const updateName = useCharacterStore((s) => s.updateName);
  const updateConfig = useCharacterStore((s) => s.updateConfig);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);
  const navigate = useNavigate();

  // CharacterCreate 와 동일한 2-step 흐름. 기존 값으로 폼 초기화하고
  // 마지막(얼굴) 단계에서 한 번에 스토어로 반영한다 (생성 대신 업데이트).
  const [step, setStep] = useState<Step>("customize");
  const [name, setName] = useState(character?.name ?? "");
  const [config, setConfig] = useState<CharacterConfig>(
    character?.config ?? FALLBACK_CONFIG,
  );

  // 스토어(localStorage)엔 없는 id로 직접 URL 진입한 경우 방어
  if (!id || !character) return <Navigate to="/characters" replace />;

  function handleBack() {
    if (step === "customize") navigate(`/characters/${id}/room`);
    else setStep("customize");
  }

  function handleCustomDone() {
    setStep("face");
  }

  function handleComplete(faceImage: string) {
    updateName(id as string, name.trim());
    updateConfig(id as string, { ...config, faceImage });
    navigate(`/characters/${id}/room`);
  }

  function handleDelete() {
    if (confirm("삭제하시겠습니까?")) {
      deleteCharacter(id as string);
      navigate("/characters");
    }
  }

  return (
    <div className={"page " + styles.page}>
      <div className="header">
        <button onClick={handleBack}>◀</button>
        <h1>캐릭터 수정 ({step === "customize" ? "1/2" : "2/2"})</h1>
        {step === "customize" && (
          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleDelete}
            aria-label="캐릭터 삭제"
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
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
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
            headShape={config.headShape}
            onHeadShapeChange={(headShape) =>
              setConfig((p) => ({ ...p, headShape }))
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

      {step === "face" && (
        <FaceCanvas
          onNext={handleComplete}
          initialImage={character.config.faceImage || undefined}
        />
      )}
    </div>
  );
}
