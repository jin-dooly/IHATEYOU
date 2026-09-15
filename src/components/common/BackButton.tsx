import type { ComponentPropsWithoutRef } from "react";

export function BackButton(props: ComponentPropsWithoutRef<"button">) {
  return (
    <button aria-label="뒤로" {...props}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  );
}
