import styles from "./CharacterConfigPicker.module.scss";

// headShape(=머리카락 모양) 옵션. id 는 config.headShape 에 저장되는 값이고
// label 은 스크린리더용. 썸네일 SVG 는 스타일별로 교체하면 된다.
const HEAD_STYLES: { id: string; label: string }[] = [
  { id: "round", label: "기본" },
  { id: "wave", label: "물결" },
  { id: "short", label: "숏컷" },
  { id: "curly", label: "곱슬" },
  { id: "bang", label: "앞머리" },
  { id: "long", label: "긴머리" },
];

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
    <div className={styles.container}>
      <div className={styles.lowItem}>
        <label htmlFor="body-color">몸 색상</label>
        <input
          type="color"
          id="body-color"
          onChange={(e) => onBodyColorChange(e.target.value)}
          defaultValue={bodyColor}
        />
      </div>
      <div className={styles.lowItem}>
        <label htmlFor="hair-color">머리카락 색상</label>
        <input
          type="color"
          id="hair-color"
          onChange={(e) => onHairColorChange(e.target.value)}
          defaultValue={hairColor}
        />
      </div>
      <div className={styles.hairSection}>
        <div className={styles.hairGrid}>
          {HEAD_STYLES.map((s) => {
            const selected = headShape === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected}
                className={`${styles.hairOption} ${
                  selected ? styles.selected : ""
                }`}
                onClick={() => onHeadShapeChange(s.id)}
              >
                {/* TODO: 스타일별 썸네일 SVG 로 교체 */}
                <svg
                  className={styles.thumb}
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    className={styles.thumbHair}
                    d="M11 25a13 13 0 0 0 26 0c0-10-6-17-13-17S11 15 11 25Z"
                  />
                  <circle className={styles.thumbFace} cx="24" cy="27" r="11" />
                </svg>
                {/* <span className={styles.srOnly}>{s.label}</span> */}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
