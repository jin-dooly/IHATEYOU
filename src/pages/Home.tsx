import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import {
  FIXED_SLOTS,
  ITEM_SIZE,
  SCATTER_WIDTH,
  SCATTER_HEIGHT,
} from "../utils/scatterLayout";
import { CharacterFigure } from "../components/character/CharacterFigure";
import type { CharacterConfig } from "../types/character";
import styles from "./Home.module.scss";

export default function Home() {
  const charactersStore = useCharacterStore((s) => s.characters);
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const characters = useMemo(
    () => Object.values(charactersStore),
    [charactersStore],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const selected = useMemo(() => {
    return characters.find((c) => c.id === selectedId);
  }, [selectedId]);

  function handleClose() {
    setSelectedId(null);
  }

  function handleGoToRoom(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    navigate(`/characters/${selectedId}/room`);
  }

  useEffect(() => {
    if (characters.length > 0) return;
    const defaultConfig: CharacterConfig = {
      headShape: "round",
      bodyColor: "#CFCCFF",
      faceImage: "",
      hair: {
        styleId: "default",
        removedStrands: [],
        color: "#000",
      },
    };
    createCharacter("default", defaultConfig);
  }, []);

  return (
    <div className="page">
      <header className="header">
        <h1>I HATE YOU</h1>
        <button
          className={"right-button"}
          onClick={() => navigate("/characters/create")}
        >
          +
        </button>
      </header>
      <div className={styles.scatterContainer}>
        <div
          className={styles.scatter}
          style={{ width: SCATTER_WIDTH, height: SCATTER_HEIGHT }}
        >
          {characters.map((c) => {
            const pos = FIXED_SLOTS[c.slotIndex];
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={styles.scatterItem}
                style={{
                  left: `${pos.x - ITEM_SIZE / 2}px`,
                  top: `${pos.y - ITEM_SIZE / 2}px`,
                }}
              >
                <CharacterFigure {...c.config} size={ITEM_SIZE} />
              </button>
            );
          })}
        </div>
        {selected && (
          <div
            className={styles.selectedCharacterContainer}
            onClick={handleClose}
          >
            <span className={styles.selectedName}>{selected.name}</span>
            <CharacterFigure {...selected.config} size={ITEM_SIZE * 3} />
            <button
              className={styles.goToCharacterRoom}
              onClick={handleGoToRoom}
            >
              괴롭히러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
