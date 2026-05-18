import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
};

export default function PageContainer({ children, className = "", noPadding = false }: Props) {
  return (
    <div
      data-page-container="true"
      className={`
        mx-auto
        w-full
        ${noPadding ? '' : 'max-w-[var(--container-xl)] px-[var(--page-padding-x)] py-[var(--page-padding-y)]'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
