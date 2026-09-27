import Icon, { type IconName } from "@/components/Icon";

// Общие элементы страниц: заголовок и карточка показателя

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  neutral: "bg-ink-100 text-ink-600",
  brand: "bg-brand-50 text-brand-600",
  positive: "bg-emerald-50 text-emerald-600",
  negative: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: IconName;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-ink-500">{label}</div>
        {icon && (
          <div className={`rounded-lg p-2 ${TONES[tone]}`}>
            <Icon name={icon} className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}
