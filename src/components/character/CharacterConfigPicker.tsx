import styles from "./CharacterConfigPicker.module.scss";
import { HAIR_STYLES } from "../../constants/hairStyles";

// 헤어스타일 썸네일용 얼굴/귀 윤곽선. hairStyles.ts 의 가닥 좌표와 같은
// 좌표계(스케일 1:1)로 그려져 있어서 별도 변환 없이 그대로 겹쳐 그릴 수 있다.
const HEAD_OUTLINE_PATHS = [
  "M23.963 82.4363C24.9392 83.8423 36.6056 103 68.6056 103C93.7269 103 107.568 87.5 107.568 87.5C107.568 87.5 112.362 82.8541 113.606 81.5C114.966 79.3805 114.971 79.5352 116.068 76.5C117.2 73.367 117.562 72.1477 118.106 70C119.077 66.1632 119.091 66.8579 119.068 63.5C119.011 55.241 119.106 53 118.106 47.5C117.106 42 116.861 41.5 116.068 39C113.148 29.7954 115.139 35.0765 112.568 29.0765C111.068 25.5765 110.568 24.5765 107.568 20.5765C106.13 18.6598 104.111 16.7437 102.068 14.5765C100.631 13.0528 98.6539 11.6261 97.036 9.93737C95.7403 8.58492 94.3415 7.70004 92.9819 6.85787C91.4137 5.8865 90.1601 4.73587 87.358 3.61457C85.4656 2.85726 83.3348 1.53791 79.3146 1.50968C71.6945 1.45616 66.227 1.63804 64.9761 1.72698C61.1214 2.00103 57.3027 3.01937 55.684 3.45889C51.568 4.57654 51.3507 4.54401 47.068 6.07654C43.275 7.43386 40.3121 8.92715 38.568 9.57654C36.669 10.2836 34.6163 12.0765 32.068 14.5765C28.5004 18.0765 27.0863 20.5765 26.068 22.0765C24.0215 25.0912 22.8396 27.4145 21.6294 29.5204C20.6062 31.3009 19.2534 34.1894 18.8272 35.5765C18.3943 36.9857 18.1806 36.7992 17.7959 38.4362C17.3629 40.2784 16.9826 42.4212 16.878 44.6601C16.7142 48.1661 16.377 49.6593 16.1742 51.4645C15.9618 53.3553 16.2966 55.7247 16.4467 58.0062C16.6104 60.4971 16.8406 62.4651 17.204 64.1133C17.6937 66.335 18.1805 68.3193 18.8272 70.1669C19.5294 72.1729 20.0923 74.3659 20.7732 75.7324C21.4754 77.1416 22.3935 80.1759 23.963 82.4363Z",
  "M14.5663 51.1154C11.1968 49.9065 6.24193 51.2304 4.68757 52.2596C2.61742 53.6302 2.18078 56.8169 1.7566 60.0859C0.711352 68.1412 3.13584 70.7239 4.08494 72.6722C4.81947 74.1801 5.76674 75.8606 6.8307 77.1428C8.17535 78.7631 10.4633 79.6517 12.4178 80.3895C13.2447 80.7016 14.6827 81.1025 16.7181 80.8009C18.0907 80.2232 18.9309 79.7262 19.5007 79.3633C19.7576 79.1294 19.949 78.7943 20.4698 78.4267",
  "M119.039 49.2789C119.464 48.6763 120.108 47.964 120.965 47.305C123.239 45.5571 127.731 47.0447 129.342 48.107C131.121 49.28 131.494 50.7948 132.78 52.9727C134.148 55.2911 134.819 58.6906 135.095 64.0234C135.273 67.4704 133.221 70.8782 131.984 72.4077C131.035 73.5815 129.89 74.5369 127.372 76.1608C125.465 77.3905 122.699 77.8912 121.246 78.1941C120.869 78.2961 120.443 78.3965 119.746 78.4483C119.048 78.5 118.091 78.5 117.106 78.5",
];

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
                {/* 실제 헤어스타일 가닥 데이터를 얼굴/귀 윤곽선 위에 그대로
                    겹쳐서 보여준다 (같은 좌표계라 별도 변환 불필요) */}
                <svg
                  className={styles.thumb}
                  viewBox="0 -10 137 115"
                  aria-hidden="true"
                >
                  <g className={styles.thumbFace}>
                    {HEAD_OUTLINE_PATHS.map((d, i) => (
                      <path key={i} d={d} />
                    ))}
                  </g>
                  <g
                    className={styles.thumbHair}
                    stroke={hairColor}
                    strokeWidth={s.strokeWidth ?? 3}
                  >
                    {s.strands.map((strand, i) => (
                      <path key={i} d={strand.d} />
                    ))}
                  </g>
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
