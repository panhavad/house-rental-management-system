import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={twMerge("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={twMerge("p-5", className)}>{children}</div>;
}
