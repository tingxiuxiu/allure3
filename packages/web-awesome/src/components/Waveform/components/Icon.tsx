import type { ComponentChildren, VNode } from "preact";

type IconName =
  | "box"
  | "pan"
  | "cursor"
  | "undo"
  | "reset"
  | "channels"
  | "image"
  | "expand"
  | "collapse"
  | "warning"
  | "sun"
  | "moon";

type Props = {
  name: IconName;
  size?: number;
};

const paths: Record<IconName, ComponentChildren> = {
  box: <path d="M5 5h14v14H5z" />,
  pan: (
    <>
      <path d="M12 2v20M2 12h20" />
      <path d="m9 5 3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3M5 9l-3 3 3 3" />
    </>
  ),
  cursor: (
    <>
      <path d="M5 3v18M19 3v18" />
      <path d="M3 6h4M17 18h4" />
    </>
  ),
  undo: <path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" />,
  reset: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </>
  ),
  channels: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 20" />
    </>
  ),
  expand: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />,
  collapse: <path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" />,
  warning: (
    <>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.2 6.2 4.8 4.8M19.2 19.2l-1.4-1.4M6.2 17.8 4.8 19.2M19.2 4.8l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z" />,
};

export function Icon({ name, size = 16 }: Props): VNode {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
