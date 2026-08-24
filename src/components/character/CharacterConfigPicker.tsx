export function CharacterConfigPicker({
  bodyColor,
  onBodyColorChange,
  hairColor,
  onHairColorChange,
  headShape,
  onHeadShapeChange,
}: {
  bodyColor: string;
  onBodyColorChange: (color: string) => void;
  hairColor: string;
  onHairColorChange: (color: string) => void;
  headShape: string;
  onHeadShapeChange: (headShape: string) => void;
}) {
  return (
    <div>
      <div>
        <label htmlFor="body-color">몸 색상</label>
        <input
          type="color"
          id="body-color"
          onChange={(e) => onBodyColorChange(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="hair-color">머리카락 색상</label>
        <input type="color" id="hair-color" />
      </div>
      <div>
        <button onClick={() => onHeadShapeChange("round")}>Round</button>
        <button onClick={() => onHeadShapeChange("square")}>Square</button>
        <button onClick={() => onHeadShapeChange("square")}>Square</button>
        <button onClick={() => onHeadShapeChange("square")}>Square</button>
        <button onClick={() => onHeadShapeChange("square")}>Square</button>
        <button onClick={() => onHeadShapeChange("square")}>Square</button>
      </div>
    </div>
  );
}
