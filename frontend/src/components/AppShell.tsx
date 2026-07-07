import { CalendarDays, ClipboardList, Home, LogOut, Package, ShieldCheck, UsersRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const navItems = [
  { to: "/", label: "Pradžia", icon: Home },
  { to: "/inventory", label: "Inventorius", icon: Package },
  { to: "/requests", label: "Prašymai", icon: ClipboardList },
  { to: "/members", label: "Nariai", icon: UsersRound, permission: "members.view" },
  { to: "/events", label: "Renginiai", icon: CalendarDays },
  { to: "/admin", label: "Administravimas", icon: ShieldCheck }
];

function hasPermission(permissions: string[] | undefined, permission: string) {
  return permissions?.some((value) => value === permission || value.startsWith(`${permission}:`)) ?? false;
}

export function AppShell() {
  const { auth, logout, selectTuntas } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SI</span>
          <div>
            <strong>Skautų inventorius</strong>
            <small>Žiniatinklio sistema</small>
          </div>
        </div>

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

        <nav className="nav-list">
          {navItems.filter((item) => !item.permission || hasPermission(auth?.permissions, item.permission)).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className="nav-link">
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="logout-button" type="button" onClick={() => void logout()}>
          <LogOut size={18} aria-hidden="true" />
          Atsijungti
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Prisijungęs vartotojas</span>
            <h1>{auth?.name ?? "Vartotojas"}</h1>
          </div>
          <div className="permission-summary">
            <strong>{auth?.permissions.length ?? 0}</strong>
            <span>teisės</span>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
