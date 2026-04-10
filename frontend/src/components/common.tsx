import type { ReactNode } from "react";
import { IconArrowLeft } from "./icons";

export const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-9 h-9 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
  </div>
);

export const ErrorMsg = ({ msg }: { msg: string }) => (
  <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-4 text-sm font-medium">
    {msg}
  </div>
);

export const Badge = ({ active }: { active: boolean }) => (
  <span
    className={`text-xs px-2.5 py-1 rounded-full font-medium ${active ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-400"}`}
  >
    {active ? "Ativo" : "Inativo"}
  </span>
);

export const inputCls =
  "w-full bg-[var(--hostly-surface-soft)] border border-[var(--hostly-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--hostly-text)] placeholder:text-[var(--hostly-muted)] outline-none focus:border-[var(--hostly-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--hostly-focus)] transition-all";

export const Field = ({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-stone-700">
      {label} {required && <span className="text-amber-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-stone-400">{hint}</p>}
  </div>
);

export const FormHeader = ({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) => (
  <div className="flex items-start gap-4 mb-8">
    <button
      onClick={onBack}
      className="mt-1 p-2 rounded-xl border border-[var(--hostly-border)] bg-white text-[var(--hostly-muted)] hover:text-[var(--hostly-text)] hover:border-stone-300 transition-colors"
    >
      <IconArrowLeft />
    </button>
    <div>
      <h1 className="text-2xl font-bold text-[var(--hostly-text)] tracking-tight">{title}</h1>
      <p className="text-sm text-[var(--hostly-muted)] mt-0.5">{subtitle}</p>
    </div>
  </div>
);

export const FormCard = ({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) => (
  <div className="card-elevated p-6">
    {title && (
      <h3 className="text-xs font-semibold text-[var(--hostly-muted)] uppercase tracking-[0.14em] mb-5">
        {title}
      </h3>
    )}
    {children}
  </div>
);
