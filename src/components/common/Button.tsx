import type { ComponentPropsWithoutRef } from "react";
import styles from "./Button.module.scss";

interface Props extends ComponentPropsWithoutRef<"button"> {
  size?: "S" | "M" | "L";
}

export default function Button({ size, className, ...res }: Props) {
  return <button {...res} className={styles.button + ` ${className}`}></button>;
}
