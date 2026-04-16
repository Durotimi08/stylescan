import React from "react";
import { clsx } from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "bg-[#0F1011] border border-[#23252A] rounded-lg p-5",
        interactive && "hover:border-[#34363C] transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
