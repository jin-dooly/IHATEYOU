import styles from "./HitHistoryChart.module.scss";
import type { DailyHitCount } from "../../utils/hitStats";

const MAX_BAR_HEIGHT = 84; // px

function dayLabel(index: number, total: number) {
  const diff = total - 1 - index;
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  return `${diff}일전`;
}

export function HitHistoryChart({ data }: { data: DailyHitCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className={styles.chart}>
      <div className={styles.bars}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const barHeight =
            d.count > 0 ? Math.max(6, Math.round((d.count / max) * MAX_BAR_HEIGHT)) : 0;
          return (
            <div key={i} className={styles.col}>
              <span className={isToday ? styles.valueToday : styles.value}>{d.count}</span>
              <div
                className={isToday ? styles.barToday : styles.bar}
                style={{ height: `${barHeight}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className={styles.labels}>
        {data.map((_, i) => (
          <span key={i} className={i === data.length - 1 ? styles.labelToday : styles.label}>
            {dayLabel(i, data.length)}
          </span>
        ))}
      </div>
    </div>
  );
}
