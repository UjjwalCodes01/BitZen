import { Star, StarHalf } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md";
  showValue?: boolean;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = "sm",
  showValue = true,
}: StarRatingProps) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const empty = maxStars - full - (hasHalf ? 1 : 0);

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star
          key={`f-${i}`}
          className={`${iconSize} fill-amber-400 text-amber-400`}
        />
      ))}
      {hasHalf && (
        <StarHalf className={`${iconSize} fill-amber-400 text-amber-400`} />
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e-${i}`} className={`${iconSize} text-zinc-600`} />
      ))}
      {showValue && (
        <span className="ml-1 text-xs text-zinc-400 font-medium">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
