import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="wops-warm-card rounded-3xl px-5 py-6 sm:px-8 sm:py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <p className="text-xs font-medium text-[#d95d39]">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-[#1f1e1c] sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-xl text-sm leading-relaxed text-[#5c5852]">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {actions}
          </div>
        ) : null}
      </div>

      {meta ? (
        <div className="mt-5 border-t border-[#ebe6dd] pt-4">{meta}</div>
      ) : null}
    </header>
  );
}
