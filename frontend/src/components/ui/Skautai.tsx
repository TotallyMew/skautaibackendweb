import { AlertCircle, Search, type LucideIcon } from "lucide-react";
import { Link, type To } from "react-router-dom";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "muted" | "info";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function SkautaiPageShell({
  eyebrow,
  title,
  actions,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section"> & {
  eyebrow?: string;
  title?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={classNames("skautai-page-shell", className)} {...props}>
      {(eyebrow || title || actions) && (
        <div className="page-heading-row">
          <div>
            {eyebrow && <span className="section-kicker">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {actions && <div className="toolbar-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function SkautaiCard({
  children,
  className,
  variant = "default",
  ...props
}: ComponentPropsWithoutRef<"section"> & {
  variant?: "default" | "flat" | "dense";
}) {
  return (
    <section className={classNames("skautai-card", `skautai-card-${variant}`, className)} {...props}>
      {children}
    </section>
  );
}

export function SkautaiHeroCard({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article className={classNames("skautai-hero-card", className)}>
      <div className="skautai-hero-row">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="skautai-hero-actions">{actions}</div>}
      </div>
      {children}
    </article>
  );
}

export function SkautaiStatusPill({
  children,
  status,
  tone = "default",
  className
}: {
  children: ReactNode;
  status?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={classNames("status-badge", "skautai-status-pill", `tone-${tone}`, status ? `status-${status.toLowerCase()}` : null, className)}>
      {children}
    </span>
  );
}

export function SkautaiSearchBar({
  value,
  onChange,
  placeholder = "Ieškoti",
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"input">, "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={classNames("search-field", "skautai-search-bar", className)}>
      <Search size={17} aria-hidden="true" />
      <input
        {...props}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SkautaiEmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={classNames("empty-state", "skautai-empty-state", compact && "compact-empty-state")}>
      <Icon size={28} aria-hidden="true" />
      <strong>{title}</strong>
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}

export function SkautaiErrorState({
  title = "Nepavyko įkelti duomenų",
  description,
  action
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="inline-alert skautai-error-state">
      <AlertCircle size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      {action}
    </div>
  );
}

export function SkautaiActionTile({
  to,
  icon: Icon,
  title,
  subtitle,
  meta,
  className
}: {
  to: To;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <Link className={classNames("home-action-tile", "skautai-action-tile", className)} to={to}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {meta && <span className="skautai-action-meta">{meta}</span>}
    </Link>
  );
}

export type SkautaiDataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function SkautaiDataTable<T>({
  rows,
  columns,
  getRowKey,
  emptyState,
  className
}: {
  rows: T[];
  columns: Array<SkautaiDataTableColumn<T>>;
  getRowKey: (row: T) => string;
  emptyState?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="table-wrap">
      <table className={classNames("data-table", "skautai-data-table", className)}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.className}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={column.className}>{column.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
