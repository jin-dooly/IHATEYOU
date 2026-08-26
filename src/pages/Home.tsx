import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import { CharacterFigure } from "../components/character/CharacterFigure";
import type { CharacterConfig } from "../types/character";

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
      <header className="home-header">
        <h1>I HATE YOU</h1>
        <button onClick={() => navigate("/characters/create")}>+</button>
      </header>

      {!selected ? (
        <div className="character-scatter">
          {characters.map((c) => (
            <div
              key={c.id}
              className="scatter-item"
              onClick={() => setSelectedId(c.id)}
            >
              <CharacterFigure {...c.config} size={56} />
            </div>
          ))}
        </div>
      ) : (
        <div className="target-hero">
          <button
            className="back-tap"
            onClick={() => setSelectedId(null)}
            aria-label="닫기"
          >
            닫기
          </button>
          <p className="target-name">{selected.name}</p>
          <div className="target-figure">
            <CharacterFigure {...selected.config} size={140} />
          </div>
          <div className="target-others">
            {characters.map((c) => (
              <CharacterFigure key={c.id} size={48} faded {...c.config} />
            ))}
          </div>
          <button
            className="primary-button"
            onClick={() => navigate(`/characters/${selected.id}/room`)}
          >
            괴롭히러 가기
          </button>
        </div>
      )}
    </div>
  );
}
