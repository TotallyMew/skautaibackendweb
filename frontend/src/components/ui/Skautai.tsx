import { AlertCircle, ChevronDown, Search, UploadCloud, X, type LucideIcon } from "lucide-react";
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
  getRowClassName,
  emptyState,
  className
}: {
  rows: T[];
  columns: Array<SkautaiDataTableColumn<T>>;
  getRowKey: (row: T) => string;
  getRowClassName?: (row: T) => string | undefined;
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
            <tr key={getRowKey(row)} className={getRowClassName?.(row)}>
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

export function SkautaiToolbar({
  title,
  meta,
  filters,
  actions,
  children,
  className
}: {
  title?: ReactNode;
  meta?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("skautai-toolbar", className)}>
      {(title || meta || actions) && (
        <div className="skautai-toolbar-row">
          <div className="skautai-toolbar-title">
            {title && <strong>{title}</strong>}
            {meta && <span>{meta}</span>}
          </div>
          {actions && <div className="toolbar-actions">{actions}</div>}
        </div>
      )}
      {filters && <div className="skautai-toolbar-filters">{filters}</div>}
      {children}
    </div>
  );
}

export type SkautaiTab = {
  id: string;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
};

export function SkautaiTabs({
  tabs,
  activeTab,
  onChange,
  label = "Skyriai",
  className
}: {
  tabs: SkautaiTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={classNames("skautai-tabs", className)} role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTab}
          className={tab.id === activeTab ? "active" : undefined}
          disabled={tab.disabled}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          {tab.count != null && <em>{tab.count}</em>}
        </button>
      ))}
    </div>
  );
}

export function SkautaiActionMenu({
  label = "Veiksmai",
  icon: Icon = ChevronDown,
  children,
  align = "end",
  className
}: {
  label?: string;
  icon?: LucideIcon;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <details className={classNames("skautai-action-menu", `align-${align}`, className)}>
      <summary className="secondary-button compact-secondary-button">
        <span>{label}</span>
        <Icon size={16} aria-hidden="true" />
      </summary>
      <div className="skautai-action-menu-panel" role="menu">
        {children}
      </div>
    </details>
  );
}

export function SkautaiActionMenuItem({
  icon: Icon,
  children,
  tone = "default",
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <button className={classNames("skautai-menu-item", `tone-${tone}`)} type="button" role="menuitem" {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

export function SkautaiPanel({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  variant = "drawer"
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "drawer" | "modal";
}) {
  if (!open) return null;

  return (
    <div className="skautai-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className={classNames("skautai-panel", `skautai-panel-${variant}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skautai-panel-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="skautai-panel-header">
          <div>
            <h2 id="skautai-panel-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Uždaryti" title="Uždaryti">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="skautai-panel-body">{children}</div>
        {footer && <footer className="skautai-panel-footer">{footer}</footer>}
      </section>
    </div>
  );
}

export function SkautaiFormSection({
  title,
  description,
  children,
  columns = 2,
  className
}: {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <section className={classNames("skautai-form-section", className)}>
      <header>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      <div className={classNames("skautai-form-grid", `columns-${columns}`)}>
        {children}
      </div>
    </section>
  );
}

export type SkautaiTimelineEntry = {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  tone?: Tone;
};

export function SkautaiTimeline({
  entries,
  emptyState
}: {
  entries: SkautaiTimelineEntry[];
  emptyState?: ReactNode;
}) {
  if (entries.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <ol className="skautai-timeline">
      {entries.map((entry) => (
        <li key={entry.id} className={classNames(entry.tone && `tone-${entry.tone}`)}>
          <span className="timeline-dot" aria-hidden="true" />
          <div>
            <strong>{entry.title}</strong>
            {entry.meta && <small>{entry.meta}</small>}
            {entry.description && <p>{entry.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SkautaiUploadField({
  label,
  description,
  accept,
  disabled,
  onFile,
  className
}: {
  label: string;
  description?: string;
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  className?: string;
}) {
  return (
    <label className={classNames("skautai-upload-field", disabled && "is-disabled", className)}>
      <UploadCloud size={20} aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

export function SkautaiConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Atšaukti",
  tone = "danger",
  isBusy = false,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: Tone;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <SkautaiPanel
      open={open}
      title={title}
      description={description}
      variant="modal"
      onClose={onCancel}
      footer={(
        <>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={isBusy}>
            {cancelLabel}
          </button>
          <button className={classNames("primary-button", `tone-${tone}`)} type="button" onClick={onConfirm} disabled={isBusy}>
            {confirmLabel}
          </button>
        </>
      )}
    >
      <span className="skautai-confirm-spacer" />
    </SkautaiPanel>
  );
}
