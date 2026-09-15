import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import {
  MAX_CHARACTERS,
  FIXED_SLOTS,
  ITEM_SIZE,
  SCATTER_WIDTH,
  SCATTER_HEIGHT,
} from "../utils/scatterLayout";
import { CharacterFigure } from "../components/character/CharacterFigure";
import styles from "./Home.module.scss";
import Button from "../components/common/Button";

export default function Home() {
  const charactersStore = useCharacterStore((s) => s.characters);
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

  function handleGoToCreate() {
    if (MAX_CHARACTERS <= characters.length) {
      return;
    }
    navigate("/characters/create");
  }

  return (
    <div className="page">
      <header className={"header " + styles.header}>
        <h1>I HATE YOU</h1>
        <button
          className={"right-button"}
          onClick={handleGoToCreate}
          disabled={MAX_CHARACTERS <= characters.length}
          aria-label="캐릭터 추가"
        >
          +
        </button>
        {characters.length === 0 && (
          <div className={styles.createHint}>
            여기를 눌러 캐릭터를 만들어보세요!
          </div>
        )}
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
                aria-label={`${c.name} 선택`}
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
            <Button
              className={styles.goToCharacterRoom}
              onClick={handleGoToRoom}
            >
              괴롭히러 가기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
