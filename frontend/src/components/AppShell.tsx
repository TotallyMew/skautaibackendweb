import {
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
  ShieldCheck,
  ShoppingCart,
  Shuffle,
  UserRound,
  UsersRound,
  X,
  type LucideIcon
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
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

const compactNavigationQuery = "(max-width: 1049px)";

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isCompactNavigation = useCompactNavigation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const title = currentTitle(location.pathname);
  const isSuperAdmin = auth?.type === "super_admin";
  const activeTuntai = auth?.tuntai.filter((tuntas) => isActiveTuntasStatus(tuntas.status)) ?? [];
  const activeTuntasName = activeTuntai.find((tuntas) => tuntas.id === auth?.activeTuntasId)?.name;
  const contextLabel = isSuperAdmin ? "Superadministratorius" : activeTuntasName ?? "Tuntas dar nepasirinktas";
  const userName = auth?.name ?? "Vartotojas";
  const userEmail = auth?.email ?? "";

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

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
              <label className="tuntas-switcher-label" htmlFor="tuntas-select">Aktyvus tuntas</label>
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
            {!isSuperAdmin && (
              <Link className="sidebar-footer-link" to="/tuntas" onClick={() => closeDrawer()}>
                <Shuffle size={17} aria-hidden="true" />
                Keisti tuntą
              </Link>
            )}
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
              <div className="topbar-title">
                <span className="eyebrow">{contextLabel}</span>
                <h1>{title}</h1>
              </div>
            </div>

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
        </header>
        <div className="content-frame">
          <Outlet />
        </div>
      </main>
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

function initials(name: string) {
  const value = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("lt-LT") ?? "")
    .join("");
  return value || "SI";
}

function currentTitle(pathname: string) {
  if (pathname === "/") return "Pradžia";
  if (pathname.startsWith("/tasks")) return "Mano užduotys";
  if (pathname.startsWith("/notifications")) return "Pranešimai";
  if (pathname.startsWith("/calendar")) return "Kalendorius";
  if (pathname.startsWith("/profile")) return "Mano profilis";
  if (pathname.startsWith("/inventory/kits")) return "Inventoriaus rinkiniai";
  if (pathname.startsWith("/inventory/audits")) return "Inventoriaus patikros";
  if (pathname.startsWith("/inventory")) return "Inventorius";
  if (pathname.startsWith("/locations")) return "Lokacijos";
  if (pathname.startsWith("/reservations")) return "Rezervacijos";
  if (pathname.startsWith("/purchases") || pathname.startsWith("/requests/requisitions")) return "Pirkimai";
  if (pathname.startsWith("/pickup-requests") || pathname.startsWith("/requests/shared")) return "Paėmimai";
  if (pathname.startsWith("/requests")) return "Pirkimai ir paėmimai";
  if (pathname.startsWith("/members")) return "Nariai";
  if (pathname.startsWith("/units")) return "Vienetai";
  if (pathname.startsWith("/events")) return "Renginiai";
  if (pathname.startsWith("/admin")) return "Administravimas";
  return "Skautų inventorius";
}
