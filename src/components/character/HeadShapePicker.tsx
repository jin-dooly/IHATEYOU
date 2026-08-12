export function HeadShapePicker({
  headShape,
  onHeadShapeChange,
}: {
  headShape: string;
  onHeadShapeChange: (headShape: string) => void;
}) {
  return (
    <div>
      <button onClick={() => onHeadShapeChange("round")}>Round</button>
      <button onClick={() => onHeadShapeChange("square")}>Square</button>
    </div>
  );
}
