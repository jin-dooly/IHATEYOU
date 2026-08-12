import type { HairState } from "../../types/character";
export function HairPicker({
  hair,
  onHairChange,
}: {
  hair: HairState;
  onHairChange: (hair: HairState) => void;
}) {
  return (
    <div>
      <button
        onClick={() => onHairChange({ styleId: "short", removedStrands: [] })}
      >
        Short
      </button>
      <button
        onClick={() => onHairChange({ styleId: "long", removedStrands: [] })}
      >
        Long
      </button>
    </div>
  );
}
