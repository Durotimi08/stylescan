import React from "react";
import { clsx } from "clsx";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "accent";
}

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex px-2 py-0.5 text-xs font-medium rounded-full border",
        {
          "bg-[#23252A]/50 text-[#8A8F98] border-[#23252A]": variant === "default",
          "bg-[#4CB782]/10 text-[#4CB782] border-[#4CB782]/20": variant === "success",
          "bg-[#F2994A]/10 text-[#F2994A] border-[#F2994A]/20": variant === "warning",
          "bg-[#EB5757]/10 text-[#EB5757] border-[#EB5757]/20": variant === "error",
          "bg-[#5E6AD2]/10 text-[#5E6AD2] border-[#5E6AD2]/20": variant === "accent",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
