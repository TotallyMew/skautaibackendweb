import { CalendarDays, ClipboardList, Flag, Inbox, MapPin, Package, Plus, UsersRound, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function DashboardPage() {
  const { auth } = useAuth();
  const activeTuntas = auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId);

  return (
    <section className="home-page">
      <article className="home-overview">
        <span className="eyebrow">Pagrindinė apžvalga</span>
        <div className="home-overview-row">
          <div>
            <h2>Sveiki, {auth?.name ?? "Vartotojau"}</h2>
            <p>{activeTuntas?.name ?? "Pasirink tuntą, kad matytum aktyvų kontekstą."}</p>
          </div>
          <Link className="secondary-button" to="/requests">
            <Flag size={17} aria-hidden="true" />
            Mano veiksmai
          </Link>
        </div>
        <div className="home-summary-grid">
          <SummaryTile label="Tuntas" value={activeTuntas?.name ?? "Nepasirinktas"} />
          <SummaryTile label="Teisės" value={`${auth?.permissions.length ?? 0}`} />
          <SummaryTile label="El. paštas" value={auth?.email ?? "-"} />
        </div>
      </article>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Mano užduotys</h2>
            <span className="eyebrow">Trumpa svarbiausių veiksmų peržiūra.</span>
          </div>
        </div>
        <article className="home-empty-card">
          <Flag size={24} aria-hidden="true" />
          <div>
            <strong>Darbo centras ruošiamas žiniatinkliui</strong>
            <span>Kol kas svarbiausi veiksmai pasiekiami per prašymų, rezervacijų ir renginių sąrašus.</span>
          </div>
        </article>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Inventorius</h2>
            <span className="eyebrow">Greita prieiga prie tunto, vieneto ir asmeninio inventoriaus.</span>
          </div>
        </div>
        <div className="home-action-grid">
          <ActionTile to="/inventory" icon={Package} title="Atidaryti inventorių" subtitle="Bendras sąrašas, paieška ir filtrai." />
          <ActionTile to="/inventory" icon={Plus} title="Naujas įrašas" subtitle="Kūrimo forma bus prijungta kitame etape." />
          <ActionTile to="/inventory" icon={MapPin} title="Lokacijos" subtitle="Lokacijų katalogas bus perkeltas iš mobiliosios programėlės." />
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Rezervacijos ir prašymai</h2>
            <span className="eyebrow">Sek aktyvias rezervacijas, pirkimus ir paėmimo prašymus.</span>
          </div>
        </div>
        <div className="home-action-grid">
          <ActionTile to="/requests" icon={CalendarDays} title="Rezervacijos" subtitle="Peržiūra, būsena ir išdavimo eiga." />
          <ActionTile to="/requests" icon={ClipboardList} title="Pirkimo prašymai" subtitle="Pirkimų eiga bus prijungta prie atskiro sąrašo." />
          <ActionTile to="/requests" icon={Inbox} title="Paėmimo prašymai" subtitle="Bendro inventoriaus paėmimo užklausos." />
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Organizacija</h2>
            <span className="eyebrow">Nariai, renginiai ir administravimo sritys.</span>
          </div>
        </div>
        <div className="home-action-grid">
          <ActionTile to="/members" icon={UsersRound} title="Nariai" subtitle="Tunto narių katalogas ir vadovavimo vaidmenys." />
          <ActionTile to="/events" icon={CalendarDays} title="Renginiai" subtitle="Renginių sąrašas, inventoriaus ir finansų suvestinės." />
          <ActionTile to="/admin" icon={Flag} title="Administravimas" subtitle="Tuntų tvirtinimas ir sistemos nustatymai." />
        </div>
      </section>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActionTile({
  to,
  icon: Icon,
  title,
  subtitle
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <Link className="home-action-tile" to={to}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </Link>
  );
}
