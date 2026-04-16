import React from "react";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center font-medium rounded-md transition-all duration-100",
        "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
        {
          "bg-[#5E6AD2] hover:bg-[#7171E1] text-white": variant === "primary",
          "bg-transparent border border-[#23252A] hover:bg-[#1A1B1E] hover:border-[#34363C] text-white":
            variant === "secondary",
          "bg-transparent hover:bg-[#1A1B1E] text-[#8A8F98] hover:text-white":
            variant === "ghost",
        },
        {
          "px-3 py-1.5 text-xs": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-5 py-2.5 text-sm": size === "lg",
        },
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
