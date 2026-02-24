import type { ReactNode } from "react";
import { IconArrowLeft } from "./icons";

export const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
  </div>
);

export const ErrorMsg = ({ msg }: { msg: string }) => (
  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-5 py-4 text-sm">
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
  "w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 transition-all";

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
      className="mt-1 p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 transition-colors"
    >
      <IconArrowLeft />
    </button>
    <div>
      <h1 className="text-xl font-semibold text-stone-800">{title}</h1>
      <p className="text-sm text-stone-400 mt-0.5">{subtitle}</p>
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
  <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
    {title && (
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-5">
        {title}
      </h3>
    )}
    {children}
  </div>
);
