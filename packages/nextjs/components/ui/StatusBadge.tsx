import { cn } from "@/lib/utils";

type BadgeVariant = "primary" | "accent" | "success" | "warning" | "error" | "neutral";

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: "bg-primary-500/10 text-primary-400 border-primary-500/20",
  accent: "bg-accent-500/10 text-accent-400 border-accent-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  neutral: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export function StatusBadge({
  label,
  variant = "neutral",
  pulse = false,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {pulse && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            variant === "success" && "bg-emerald-400",
            variant === "primary" && "bg-primary-400",
            variant === "accent" && "bg-accent-400",
            variant === "warning" && "bg-amber-400",
            variant === "error" && "bg-red-400",
            variant === "neutral" && "bg-zinc-400"
          )}
        />
      )}
      {label}
    </span>
  );
}
