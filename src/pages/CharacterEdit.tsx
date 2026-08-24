// pages/CharacterEdit.tsx
import { useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useCharacterStore } from "../store/characterStore";
import { CharacterConfigPicker } from "../components/character/CharacterConfigPicker";

export default function CharacterEdit() {
  const { id } = useParams<{ id: string }>();
  const character = useCharacterStore((s) =>
    id ? s.characters[id] : undefined,
  );
  const updateName = useCharacterStore((s) => s.updateName);
  const updateConfig = useCharacterStore((s) => s.updateConfig);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);
  const navigate = useNavigate();
  const [name, setName] = useState(character?.name ?? "");

  // 스토어(localStorage)엔 없는 id로 직접 URL 진입한 경우 방어
  if (!id || !character) return <Navigate to="/characters" replace />;

  function handleSave() {
    updateName(id as string, name.trim());
    navigate("/characters");
  }

  function handleDelete() {
    if (confirm(`"${character?.name}"을(를) 삭제할까요?`)) {
      deleteCharacter(id as string);
      navigate("/characters");
    }
  }

  return (
    <div className="page">
      <div className="step-header">
        <button onClick={() => navigate("/characters")}>←</button>
        <span>편집</span>
      </div>

      {/* CharaterCreate UI 참고 */}

      <button className="primary-button" onClick={handleSave}>
        저장
      </button>
      <button className="danger-button" onClick={handleDelete}>
        삭제
      </button>
    </div>
  );
}
