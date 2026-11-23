import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SquircleCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "dark" | "purple";
};

export function SquircleCard({
  variant = "default",
  className,
  children,
  ...props
}: SquircleCardProps) {
  return (
    <div
      className={cn(
        "forma-squircle p-5 sm:p-6",
        variant === "dark" && "forma-squircle-dark",
        variant === "purple" && "bg-(--forma-purple) text-white",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
