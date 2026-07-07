import { CheckCircle2, Database, GitBranch, MonitorSmartphone } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

const phases = [
  "Auth, refresh, tuntas selection, protected routes",
  "Inventory, item detail, QR lookup, locations, kits, audits",
  "Reservations, requisitions, bendras requests, approvals",
  "Members, units, roles, ranks, invitations, leadership",
  "Events, purchases, pastovykles, reconciliation, movements",
  "Superadmin, notifications, calendar, tasks, profile"
];

export function DashboardPage() {
  const { auth } = useAuth();

  return (
    <section className="page-grid">
      <article className="overview-panel">
        <h2>Web projekto busena</h2>
        <div className="status-grid">
          <div className="status-item">
            <MonitorSmartphone size={22} aria-hidden="true" />
            <strong>Atskiras web klientas</strong>
            <span>React + Vite + TypeScript</span>
          </div>
          <div className="status-item">
            <GitBranch size={22} aria-hidden="true" />
            <strong>Atskiras web backend</strong>
            <span>Kopija nuo mobiliojo backend</span>
          </div>
          <div className="status-item">
            <Database size={22} aria-hidden="true" />
            <strong>Bendra duomenu baze</strong>
            <span>Schemos keitimai tik suderinami</span>
          </div>
        </div>
      </article>

      <article className="overview-panel">
        <h2>Pariteto kelias</h2>
        <ol className="phase-list">
          {phases.map((phase, index) => (
            <li key={phase}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>Faze {index + 1}: {phase}</span>
            </li>
          ))}
        </ol>
      </article>

      <article className="overview-panel wide-panel">
        <h2>Aktyvus kontekstas</h2>
        <dl className="context-list">
          <div>
            <dt>Tuntas</dt>
            <dd>{auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId)?.name ?? "Nepasirinktas"}</dd>
          </div>
          <div>
            <dt>El. pastas</dt>
            <dd>{auth?.email}</dd>
          </div>
          <div>
            <dt>Teises</dt>
            <dd>{auth?.permissions.length ? auth.permissions.join(", ") : "Teises bus rodomos pasirinkus aktyvu tunta."}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}

