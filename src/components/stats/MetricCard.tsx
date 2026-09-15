import styles from "./MetricCard.module.scss";

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
