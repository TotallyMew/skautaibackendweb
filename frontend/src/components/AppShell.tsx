import { CalendarDays, ClipboardList, Home, ListTodo, LogOut, Package, ShieldCheck, Shuffle, UsersRound, type LucideIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const quickAccessItems = [
  { to: "/", label: "Pradžia", icon: Home },
  { to: "/tasks", label: "Mano užduotys", icon: ListTodo },
  { to: "/inventory", label: "Inventorius", icon: Package },
  { to: "/requests", label: "Prašymai", icon: ClipboardList },
  { to: "/events", label: "Renginiai", icon: CalendarDays }
];

const managementItems = [
  { to: "/members", label: "Nariai", icon: UsersRound, permission: "members.view" },
  { to: "/admin", label: "Administravimas", icon: ShieldCheck }
];

function hasPermission(permissions: string[] | undefined, permission: string) {
  return permissions?.some((value) => value === permission || value.startsWith(`${permission}:`)) ?? false;
}

export function AppShell() {
  const { auth, logout, selectTuntas } = useAuth();
  const location = useLocation();
  const title = currentTitle(location.pathname);
  const isSuperAdmin = auth?.type === "super_admin";
  const activeTuntasName = auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId)?.name;
  const contextLabel = isSuperAdmin ? "Visi tuntai" : activeTuntasName ?? "Tuntas dar nepasirinktas";

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
              onChange={(event) => selectTuntas(event.target.value)}
            >
              {auth?.tuntai.map((tuntas) => (
                <option key={tuntas.id} value={tuntas.id}>{tuntas.name}</option>
              ))}
            </select>
          </>
        )}

        {!isSuperAdmin && <DrawerSection title="Greita prieiga" items={quickAccessItems} permissions={auth?.permissions} />}
        <DrawerSection title="Valdymas" items={managementItems} permissions={auth?.permissions} forceAdmin={isSuperAdmin} />

        {!isSuperAdmin && (
          <div className="drawer-section account-section">
            <span className="drawer-section-title">Paskyra</span>
            <button className="nav-link nav-button" type="button" onClick={() => document.getElementById("tuntas-select")?.focus()}>
              <Shuffle size={18} aria-hidden="true" />
              <span>Keisti tuntą</span>
            </button>
          </div>
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
          <div className="permission-summary">
            <strong>{isSuperAdmin ? "SA" : auth?.permissions.length ?? 0}</strong>
            <span>{isSuperAdmin ? "režimas" : "teisės"}</span>
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
  permission?: string;
};

function DrawerSection({
  title,
  items,
  permissions,
  forceAdmin = false
}: {
  title: string;
  items: NavItem[];
  permissions?: string[];
  forceAdmin?: boolean;
}) {
  const visibleItems = items.filter((item) => forceAdmin ? item.to === "/admin" : !item.permission || hasPermission(permissions, item.permission));
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

function currentTitle(pathname: string) {
  if (pathname === "/") return "Pradžia";
  if (pathname.startsWith("/tasks")) return "Mano užduotys";
  if (pathname.startsWith("/inventory")) return "Inventorius";
  if (pathname.startsWith("/requests")) return "Prašymai";
  if (pathname.startsWith("/members")) return "Nariai";
  if (pathname.startsWith("/events")) return "Renginiai";
  if (pathname.startsWith("/admin")) return "Administravimas";
  return "Skautų inventorius";
}
