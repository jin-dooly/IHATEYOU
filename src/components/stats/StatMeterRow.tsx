import type { ReactNode } from "react";
import styles from "./StatMeterRow.module.scss";

export function StatMeterRow({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={styles.row}>
      <div
        className={styles.iconBadge}
        style={{ color, backgroundColor: `${color}1a` }}
      >
        {icon}
      </div>
      <span className={styles.label}>{label}</span>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className={styles.pct}>{value}%</span>
    </div>
  );
}
