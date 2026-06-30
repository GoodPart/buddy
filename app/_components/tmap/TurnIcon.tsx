import type { TurnIconKind } from "@/lib/tmap/guidance";

type TurnIconProps = {
  kind: TurnIconKind;
  className?: string;
};

export default function TurnIcon({ kind, className = "h-10 w-10" }: TurnIconProps) {
  const stroke = "currentColor";
  const sw = 2.2;

  switch (kind) {
    case "left":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <path
            d="M28 8v12h8l-14 18-14-18h8V8z"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </svg>
      );
    case "right":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <path
            d="M20 8v12h-8l14 18 14-18h-8V8z"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </svg>
      );
    case "uturn":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <path
            d="M30 10a12 12 0 0 0-12 12v6M14 22l-6 6 6 6"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "roundabout":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <circle
            cx="24"
            cy="26"
            r="10"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
          />
          <path
            d="M24 8v8M34 26h8"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </svg>
      );
    case "arrive":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <path
            d="M24 6c-6 0-11 5-11 11 0 8 11 19 11 19s11-11 11-11-19c0-6-5-11-11-11z"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <circle cx="24" cy="17" r="3.5" fill={stroke} />
        </svg>
      );
    case "fork":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <path
            d="M24 8v14M24 22l-12 16M24 22l12 16"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "straight":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <path
            d="M24 38V10M24 10l-8 8M24 10l8 8"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <circle
            cx="24"
            cy="24"
            r="14"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
          />
          <path
            d="M24 16v8l4 4"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
