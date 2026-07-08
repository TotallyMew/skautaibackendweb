import { Bell, CalendarDays, ClipboardList, Home, ListTodo, LogOut, MapPinned, Package, ShieldCheck, Shuffle, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { isActiveTuntasStatus } from "../auth/authStorage";

const quickAccessItems: NavItem[] = [
  { to: "/", label: "Pradžia", icon: Home },
  { to: "/tasks", label: "Mano užduotys", icon: ListTodo },
  { to: "/notifications", label: "Pranešimai", icon: Bell },
  { to: "/calendar", label: "Kalendorius", icon: CalendarDays },
  { to: "/inventory", label: "Inventorius", icon: Package, anyPermission: ["items.view", "items.create", "items.review"] },
  { to: "/locations", label: "Lokacijos", icon: MapPinned },
  { to: "/requests", label: "Prašymai", icon: ClipboardList, anyPermission: ["reservations.view", "reservations.create", "requisitions.create", "items.request.bendras", "items.request.approve"] },
  { to: "/events", label: "Renginiai", icon: CalendarDays, anyPermission: ["events.view"] }
];

const managementItems: NavItem[] = [
  { to: "/members", label: "Nariai", icon: UsersRound, anyPermission: ["members.view"] },
  { to: "/admin", label: "Administravimas", icon: ShieldCheck, superAdminOnly: true }
];

const accountItems: NavItem[] = [
  { to: "/profile", label: "Mano profilis", icon: UserRound },
  { to: "/tuntas", label: "Keisti tuntą", icon: Shuffle }
];

export function AppShell() {
  const { auth, logout, selectTuntas } = useAuth();
  const location = useLocation();
  const title = currentTitle(location.pathname);
  const isSuperAdmin = auth?.type === "super_admin";
  const activeTuntai = auth?.tuntai.filter((tuntas) => isActiveTuntasStatus(tuntas.status)) ?? [];
  const activeTuntasName = activeTuntai.find((tuntas) => tuntas.id === auth?.activeTuntasId)?.name;
  const contextLabel = isSuperAdmin ? "Superadministratorius" : activeTuntasName ?? "Tuntas dar nepasirinktas";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="drawer-identity">
          <strong>Skautų Inventorius</strong>
          <span>{auth?.name ?? "Vartotojas"}</span>
          <span>{contextLabel}</span>
        </div>

        <div className="brand compact-brand">
          <span className="brand-mark">SI</span>
          <div>
            <strong>Skautų inventorius</strong>
            <small>Žiniatinklio sistema</small>
          </div>
        </div>

        {!isSuperAdmin && (
          <>
            <label className="field-label" htmlFor="tuntas-select">Tuntas</label>
            <select
              id="tuntas-select"
              className="select"
              value={auth?.activeTuntasId ?? ""}
              onChange={(event) => void selectTuntas(event.target.value)}
            >
              {activeTuntai.map((tuntas) => (
                <option key={tuntas.id} value={tuntas.id}>{tuntas.name}</option>
              ))}
            </select>
          </>
        )}

        {!isSuperAdmin && <DrawerSection title="Greita prieiga" items={quickAccessItems} permissions={auth?.permissions} />}
        <DrawerSection title="Valdymas" items={managementItems} permissions={auth?.permissions} isSuperAdmin={isSuperAdmin} />

        {!isSuperAdmin && (
          <DrawerSection title="Paskyra" items={accountItems} permissions={auth?.permissions} />
        )}

        <button className="logout-button" type="button" onClick={() => void logout()}>
          <LogOut size={18} aria-hidden="true" />
          Atsijungti
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">{contextLabel}</span>
            <h1>{title}</h1>
          </div>
          <div className="topbar-context">
            <strong>{isSuperAdmin ? "Sistemos valdymas" : auth?.name ?? "Vartotojas"}</strong>
            <span>{isSuperAdmin ? "Visi tuntai" : auth?.email ?? ""}</span>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  anyPermission?: string[];
  superAdminOnly?: boolean;
};

function DrawerSection({
  title,
  items,
  permissions,
  isSuperAdmin = false
}: {
  title: string;
  items: NavItem[];
  permissions?: string[];
  isSuperAdmin?: boolean;
}) {
  const visibleItems = items.filter((item) => isVisibleNavItem(item, permissions, isSuperAdmin));
  if (visibleItems.length === 0) return null;

  return (
    <nav className="drawer-section" aria-label={title}>
      <span className="drawer-section-title">{title}</span>
      <div className="nav-list">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className="nav-link">
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function isVisibleNavItem(item: NavItem, permissions: string[] | undefined, isSuperAdmin: boolean) {
  if (item.superAdminOnly) return isSuperAdmin;
  if (isSuperAdmin) return false;
  if (!item.anyPermission?.length) return true;
  return item.anyPermission.some((permission) => hasPermission(permissions, permission));
}

function hasPermission(permissions: string[] | undefined, permission: string) {
  return permissions?.some((value) => value === permission || value.startsWith(`${permission}:`)) ?? false;
}

function currentTitle(pathname: string) {
  if (pathname === "/") return "Pradžia";
  if (pathname.startsWith("/tasks")) return "Mano užduotys";
  if (pathname.startsWith("/notifications")) return "Pranešimai";
  if (pathname.startsWith("/calendar")) return "Kalendorius";
  if (pathname.startsWith("/profile")) return "Mano profilis";
  if (pathname.startsWith("/inventory")) return "Inventorius";
  if (pathname.startsWith("/locations")) return "Lokacijos";
  if (pathname.startsWith("/requests")) return "Prašymai";
  if (pathname.startsWith("/members")) return "Nariai";
  if (pathname.startsWith("/events")) return "Renginiai";
  if (pathname.startsWith("/admin")) return "Administravimas";
  return "Skautų inventorius";
}
