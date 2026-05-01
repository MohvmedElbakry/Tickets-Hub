import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function PageContainer({ children, className = "" }: Props) {
  return (
    <div
      data-page-container="true"
      className={`
        mx-auto
        w-full
        max-w-[var(--container-xl)]
        px-[var(--page-padding-x)]
        py-[var(--page-padding-y)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
