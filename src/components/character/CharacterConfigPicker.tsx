import styles from "./CharacterConfigPicker.module.scss";
import { HAIR_STYLES } from "../../constants/hairStyles";

export function CharacterConfigPicker({
  bodyColor,
  onBodyColorChange,
  hairColor,
  onHairColorChange,
  hairStyleId,
  onHairStyleChange,
}: {
  bodyColor: string;
  onBodyColorChange: (color: string) => void;
  hairColor: string;
  onHairColorChange: (color: string) => void;
  hairStyleId: string;
  onHairStyleChange: (styleId: string) => void;
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
          {HAIR_STYLES.map((s) => {
            const selected = hairStyleId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected}
                className={`${styles.hairOption} ${
                  selected ? styles.selected : ""
                }`}
                onClick={() => onHairStyleChange(s.id)}
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
