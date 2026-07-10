import {
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Home,
  ListTodo,
  LogOut,
  MapPinned,
  Menu,
  Network,
  Package,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  UsersRound,
  X,
  type LucideIcon
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { isActiveTuntasStatus } from "../auth/authStorage";
import {
  canUseEvents,
  canUseInventory,
  canUseLocations,
  canUseMembers,
  canUseRequisitions,
  canUseReservations,
  canUseSharedInventoryRequests,
  canUseUnits
} from "../utils/permissions";

const compactNavigationQuery = "(max-width: 1050px)";

const overviewItems: NavItem[] = [
  { to: "/", label: "Pradžia", icon: Home, end: true },
  {
    to: "/inventory",
    label: "Inventorius",
    icon: Package,
    canShow: canUseInventory,
    end: true,
    children: [
      { to: "/inventory/kits", label: "Rinkiniai", icon: PackageCheck },
      { to: "/inventory/audits", label: "Patikros", icon: ClipboardCheck }
    ]
  }
];

const planningItems: NavItem[] = [
  { to: "/reservations", label: "Rezervacijos", icon: CalendarDays, canShow: canUseReservations },
  { to: "/events", label: "Renginiai", icon: CalendarDays, canShow: canUseEvents },
  { to: "/calendar", label: "Kalendorius", icon: CalendarDays }
];

const requestItems: NavItem[] = [
  { to: "/purchases", label: "Pirkimai", icon: ShoppingCart, canShow: canUseRequisitions },
  { to: "/pickup-requests", label: "Paėmimai", icon: PackageCheck, canShow: canUseSharedInventoryRequests }
];

const organizationItems: NavItem[] = [
  { to: "/locations", label: "Lokacijos", icon: MapPinned, canShow: canUseLocations },
  { to: "/members", label: "Nariai", icon: UsersRound, canShow: canUseMembers },
  { to: "/units", label: "Vienetai", icon: Network, canShow: canUseUnits }
];

const adminItems: NavItem[] = [
  { to: "/admin", label: "Administravimas", icon: ShieldCheck, superAdminOnly: true }
];

export function AppShell() {
  const { auth, logout, selectTuntas } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const isCompactNavigation = useCompactNavigation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const isSuperAdmin = auth?.type === "super_admin";
  const activeTuntai = auth?.tuntai.filter((tuntas) => isActiveTuntasStatus(tuntas.status)) ?? [];
  const activeTuntasName = activeTuntai.find((tuntas) => tuntas.id === auth?.activeTuntasId)?.name;
  const contextLabel = isSuperAdmin ? "Superadministratorius" : activeTuntasName ?? "Tuntas dar nepasirinktas";
  const userName = auth?.name ?? "Vartotojas";
  const userEmail = auth?.email ?? "";
  const commandDestinations = buildCommandDestinations(auth?.permissions, isSuperAdmin);
  const normalizedCommandQuery = commandQuery.trim().toLocaleLowerCase("lt-LT");
  const commandResults = commandDestinations.filter((destination) => (
    !normalizedCommandQuery || [destination.label, destination.group, ...(destination.keywords ?? [])]
      .join(" ")
      .toLocaleLowerCase("lt-LT")
      .includes(normalizedCommandQuery)
  ));

  useEffect(() => {
    setIsDrawerOpen(false);
    setIsCommandOpen(false);
    setCommandQuery("");
  }, [location.pathname]);

  useEffect(() => {
    function handleCommandShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.isContentEditable;
      const isCommandShortcut = (event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k";
      const isSlashShortcut = event.key === "/" && !isEditing;

      if (isCommandShortcut || isSlashShortcut) {
        event.preventDefault();
        setIsDrawerOpen(false);
        setIsCommandOpen(true);
        return;
      }

      if (event.key === "Escape" && isCommandOpen) {
        event.preventDefault();
        setIsCommandOpen(false);
        setCommandQuery("");
      }
    }

    document.addEventListener("keydown", handleCommandShortcut);
    return () => document.removeEventListener("keydown", handleCommandShortcut);
  }, [isCommandOpen]);

  useEffect(() => {
    if (!isCommandOpen) return;

    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => commandInputRef.current?.focus());
    document.body.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
    };
  }, [isCommandOpen]);

  useEffect(() => {
    if (!isCompactNavigation) {
      setIsDrawerOpen(false);
      return;
    }

    if (!isDrawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsDrawerOpen(false);
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isCompactNavigation, isDrawerOpen]);

  function closeDrawer(restoreFocus = false) {
    setIsDrawerOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }

  function closeCommand() {
    setIsCommandOpen(false);
    setCommandQuery("");
  }

  function handleDrawerKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (!isCompactNavigation || !isDrawerOpen || event.key !== "Tab") return;

    const focusableElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    if (!firstElement || !lastElement) return;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <div className="app-shell">
      {isDrawerOpen && (
        <button
          className="drawer-backdrop"
          type="button"
          aria-label="Uždaryti pagrindinę navigaciją"
          onClick={() => closeDrawer(true)}
        />
      )}

      <aside
        id="primary-navigation"
        className={`sidebar${isDrawerOpen ? " is-open" : ""}`}
        aria-label="Pagrindinė navigacija"
        aria-hidden={isCompactNavigation && !isDrawerOpen}
        aria-modal={isCompactNavigation ? true : undefined}
        role={isCompactNavigation ? "dialog" : undefined}
        onKeyDown={handleDrawerKeyDown}
      >
        <header className="sidebar-header">
          <Link className="brand" to="/" aria-label="Skautų inventorius – pradžia" onClick={() => closeDrawer()}>
            <span className="brand-mark" aria-hidden="true">SI</span>
            <span className="brand-copy">
              <strong>Skautų inventorius</strong>
              <small>Valdymo sistema</small>
            </span>
          </Link>
          <button
            ref={closeButtonRef}
            className="sidebar-close-button"
            type="button"
            aria-label="Uždaryti navigaciją"
            onClick={() => closeDrawer(true)}
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="sidebar-scroll">
          {!isSuperAdmin && (
            <div className="tuntas-switcher">
              <div className="tuntas-switcher-heading">
                <label className="tuntas-switcher-label" htmlFor="tuntas-select">Aktyvus tuntas</label>
                <Link className="tuntas-manage-link" to="/tuntas" onClick={() => closeDrawer()}>
                  Valdyti
                </Link>
              </div>
              <select
                id="tuntas-select"
                className="select"
                value={auth?.activeTuntasId ?? ""}
                onChange={(event) => {
                  void selectTuntas(event.target.value);
                  closeDrawer();
                }}
              >
                {activeTuntai.map((tuntas) => (
                  <option key={tuntas.id} value={tuntas.id}>{tuntas.name}</option>
                ))}
              </select>
            </div>
          )}

          {!isSuperAdmin && (
            <>
              <DrawerSection title="Darbo erdvė" items={overviewItems} permissions={auth?.permissions} onNavigate={() => closeDrawer()} />
              <DrawerSection title="Planavimas" items={planningItems} permissions={auth?.permissions} onNavigate={() => closeDrawer()} />
              <DrawerSection title="Prašymai" items={requestItems} permissions={auth?.permissions} onNavigate={() => closeDrawer()} />
              <DrawerSection title="Organizacija" items={organizationItems} permissions={auth?.permissions} onNavigate={() => closeDrawer()} />
            </>
          )}

          {isSuperAdmin && (
            <DrawerSection
              title="Sistemos valdymas"
              items={adminItems}
              permissions={auth?.permissions}
              isSuperAdmin
              onNavigate={() => closeDrawer()}
            />
          )}
        </div>

        <footer className="sidebar-footer">
          {isSuperAdmin ? (
            <div className="sidebar-account" aria-label={`Prisijungęs vartotojas: ${userName}`}>
              <AccountIdentity name={userName} email={userEmail || "Superadministratorius"} />
            </div>
          ) : (
            <Link className="sidebar-account" to="/profile" onClick={() => closeDrawer()}>
              <AccountIdentity name={userName} email={userEmail} />
            </Link>
          )}
          <div className="sidebar-footer-actions">
            <button className="logout-button" type="button" onClick={() => void logout()}>
              <LogOut size={17} aria-hidden="true" />
              Atsijungti
            </button>
          </div>
        </footer>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-leading">
              <button
                ref={menuButtonRef}
                className="mobile-menu-button"
                type="button"
                aria-label="Atidaryti pagrindinę navigaciją"
                aria-controls="primary-navigation"
                aria-expanded={isDrawerOpen}
                onClick={() => setIsDrawerOpen(true)}
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <span className="topbar-context" title="Aktyvus organizacijos kontekstas">{contextLabel}</span>
            </div>

            <div className="topbar-actions">
              <button
                className="topbar-command-trigger"
                type="button"
                aria-label="Atidaryti greitą paiešką"
                aria-haspopup="dialog"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsCommandOpen(true);
                }}
              >
                <Search size={17} aria-hidden="true" />
                <span>Ieškoti skiltyse...</span>
                <kbd>Ctrl K</kbd>
              </button>

              {!isSuperAdmin ? (
                <nav className="topbar-utilities" aria-label="Greitosios nuorodos">
                  <UtilityLink to="/tasks" label="Užduotys" icon={ListTodo} />
                  <UtilityLink to="/notifications" label="Pranešimai" icon={Bell} />
                  <UtilityLink to="/profile" label="Profilis" icon={UserRound} />
                </nav>
              ) : (
                <span className="topbar-admin-context">
                  <ShieldCheck size={17} aria-hidden="true" />
                  Sistemos valdymas
                </span>
              )}
            </div>
          </div>
        </header>
        <div className="content-frame">
          <Outlet />
        </div>
      </main>

      {isCommandOpen && (
        <div className="command-overlay" role="presentation" onMouseDown={closeCommand}>
          <section
            className="command-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Greita paieška"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <label className="command-search-row">
              <Search size={19} aria-hidden="true" />
              <input
                ref={commandInputRef}
                type="search"
                value={commandQuery}
                placeholder="Ieškoti puslapio arba skilties"
                aria-label="Ieškoti puslapio arba skilties"
                onChange={(event) => setCommandQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || !commandResults[0]) return;
                  event.preventDefault();
                  navigate(commandResults[0].to);
                  closeCommand();
                }}
              />
              <kbd>Esc</kbd>
            </label>

            <div className="command-results" aria-live="polite">
              <span className="command-results-label">
                {normalizedCommandQuery ? `${commandResults.length} rezultatai` : "Greita navigacija"}
              </span>
              {commandResults.length > 0 ? commandResults.map((destination) => {
                const Icon = destination.icon;
                const isCurrent = isCurrentDestination(location.pathname, destination.to);
                return (
                  <Link
                    key={destination.to}
                    className={`command-result${isCurrent ? " is-current" : ""}`}
                    to={destination.to}
                    onClick={closeCommand}
                  >
                    <span className="command-result-icon" aria-hidden="true"><Icon size={18} /></span>
                    <span className="command-result-copy">
                      <strong>{destination.label}</strong>
                      <small>{destination.group}{isCurrent ? " · Atidaryta" : ""}</small>
                    </span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                );
              }) : (
                <div className="command-empty-state">
                  <Search size={22} aria-hidden="true" />
                  <strong>Atitinkančios skilties nerasta</strong>
                  <span>Pabandyk trumpesnį arba bendresnį pavadinimą.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  canShow?: (permissions: string[] | undefined) => boolean;
  superAdminOnly?: boolean;
  end?: boolean;
  children?: NavItem[];
};

type CommandDestination = {
  to: string;
  label: string;
  group: string;
  icon: LucideIcon;
  keywords?: string[];
};

function DrawerSection({
  title,
  items,
  permissions,
  isSuperAdmin = false,
  onNavigate
}: {
  title: string;
  items: NavItem[];
  permissions?: string[];
  isSuperAdmin?: boolean;
  onNavigate: () => void;
}) {
  const visibleItems = items.filter((item) => isVisibleNavItem(item, permissions, isSuperAdmin));
  if (visibleItems.length === 0) return null;

  return (
    <nav className="drawer-section" aria-label={title}>
      <span className="drawer-section-title">{title}</span>
      <div className="nav-list">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <div className="nav-item-group" key={item.to}>
              <NavLink to={item.to} end={item.end} className="nav-link" onClick={onNavigate}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
              {item.children && (
                <div className="nested-nav-list" aria-label={`${item.label} skyriai`}>
                  {item.children.map((child) => (
                    <NavLink key={child.to} to={child.to} className="nested-nav-link" onClick={onNavigate}>
                      <span className="nested-nav-marker" aria-hidden="true" />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function UtilityLink({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink className="topbar-utility-link" to={to} aria-label={label} title={label}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

function AccountIdentity({ name, email }: { name: string; email: string }) {
  return (
    <>
      <span className="account-avatar" aria-hidden="true">{initials(name)}</span>
      <span className="account-copy">
        <strong>{name}</strong>
        <small>{email}</small>
      </span>
    </>
  );
}

function useCompactNavigation() {
  const [isCompact, setIsCompact] = useState(() => (
    typeof window !== "undefined" && window.matchMedia(compactNavigationQuery).matches
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia(compactNavigationQuery);
    const update = (event: MediaQueryListEvent) => setIsCompact(event.matches);
    setIsCompact(mediaQuery.matches);
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isCompact;
}

function isVisibleNavItem(item: NavItem, permissions: string[] | undefined, isSuperAdmin: boolean) {
  if (item.superAdminOnly) return isSuperAdmin;
  if (isSuperAdmin) return false;
  return item.canShow ? item.canShow(permissions) : true;
}

function buildCommandDestinations(permissions: string[] | undefined, isSuperAdmin: boolean): CommandDestination[] {
  const destinations: CommandDestination[] = [];
  const sections = isSuperAdmin
    ? [{ title: "Sistemos valdymas", items: adminItems }]
    : [
        { title: "Darbo erdvė", items: overviewItems },
        { title: "Planavimas", items: planningItems },
        { title: "Prašymai", items: requestItems },
        { title: "Organizacija", items: organizationItems }
      ];

  sections.forEach((section) => {
    section.items
      .filter((item) => isVisibleNavItem(item, permissions, isSuperAdmin))
      .forEach((item) => {
        destinations.push({
          to: item.to,
          label: item.label,
          group: section.title,
          icon: item.icon,
          keywords: commandKeywords(item.to)
        });
        item.children?.forEach((child) => destinations.push({
          to: child.to,
          label: child.label,
          group: item.label,
          icon: child.icon,
          keywords: commandKeywords(child.to)
        }));
      });
  });

  if (!isSuperAdmin) {
    destinations.push(
      { to: "/tasks", label: "Mano užduotys", group: "Asmeninė erdvė", icon: ListTodo, keywords: ["veiksmai", "darbai"] },
      { to: "/notifications", label: "Pranešimai", group: "Asmeninė erdvė", icon: Bell, keywords: ["naujienos"] },
      { to: "/profile", label: "Mano profilis", group: "Asmeninė erdvė", icon: UserRound, keywords: ["paskyra", "nustatymai"] }
    );
  }

  return Array.from(new Map(destinations.map((destination) => [destination.to, destination])).values());
}

function commandKeywords(pathname: string) {
  const keywords: Record<string, string[]> = {
    "/": ["pagrindinis", "apžvalga"],
    "/inventory": ["daiktai", "sandėlis"],
    "/inventory/kits": ["komplektai"],
    "/inventory/audits": ["inventorizacija", "tikrinimas"],
    "/reservations": ["rezervuoti", "išdavimas"],
    "/events": ["stovykla", "renginys"],
    "/calendar": ["datos", "grafikas"],
    "/purchases": ["pirkimo prašymai", "papildymas"],
    "/pickup-requests": ["bendras inventorius", "prašymai"],
    "/locations": ["sandėliai", "vietos"],
    "/members": ["žmonės", "vadovai"],
    "/units": ["draugovės", "padaliniai"]
  };
  return keywords[pathname];
}

function isCurrentDestination(pathname: string, destination: string) {
  return destination === "/" ? pathname === "/" : pathname === destination || pathname.startsWith(`${destination}/`);
}

function initials(name: string) {
  const value = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("lt-LT") ?? "")
    .join("");
  return value || "SI";
}
