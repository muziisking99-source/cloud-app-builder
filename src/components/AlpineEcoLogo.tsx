import logoSrc from "@/assets/alpine-eco-logo.png";

type Props = {
  className?: string;
  /** Display width in pixels; height follows the 645×311 aspect ratio. */
  width?: number;
};

export function AlpineEcoLogo({ className = "", width = 160 }: Props) {
  return (
    <img
      src={logoSrc}
      alt="Alpine-Eco Notebooks and Diaries"
      width={width}
      height={Math.round(width * (311 / 645))}
      className={`h-auto max-w-full ${className}`}
      style={{ width }}
    />
  );
}
