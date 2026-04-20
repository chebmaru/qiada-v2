import Image from "next/image";

type Size = "sm" | "md" | "lg";

const dimensions: Record<Size, { width: number; height: number }> = {
  sm: { width: 48, height: 48 },
  md: { width: 128, height: 128 },
  lg: { width: 192, height: 192 },
};

export default function SignImage({
  src,
  alt = "",
  size = "md",
  className = "",
}: {
  src: string | null | undefined;
  alt?: string;
  size?: Size;
  className?: string;
}) {
  if (!src) return null;

  const { width, height } = dimensions[size];

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`object-contain ${className}`}
      loading="lazy"
    />
  );
}
