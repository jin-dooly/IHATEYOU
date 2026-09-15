import type { ComponentPropsWithoutRef } from "react";
import styles from "./Button.module.scss";

type Props = ComponentPropsWithoutRef<"button">;

export default function Button({ className, ...res }: Props) {
  return <button {...res} className={styles.button + ` ${className}`}></button>;
}
