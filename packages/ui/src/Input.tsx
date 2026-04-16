import React from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        "w-full px-3 py-2 bg-[#0F1011] border border-[#23252A] rounded-md",
        "text-sm text-[#F7F8F8] placeholder:text-[#62666D]",
        "focus:border-[#5E6AD2] focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/20",
        "transition-colors duration-100",
        className
      )}
      {...props}
    />
  );
}
