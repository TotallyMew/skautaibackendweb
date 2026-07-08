import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, LogOut, RefreshCw, ShieldCheck, TicketCheck } from "lucide-react";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { isActiveTuntasStatus } from "../auth/authStorage";
import type { UserTuntas } from "../api/types";

export function TuntasSelectPage() {
  const { auth, acceptInvitation, logout, refreshTuntai, selectTuntas } = useAuth();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedFreshTuntai, setHasLoadedFreshTuntai] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTuntai = useMemo(() => auth?.tuntai.filter((tuntas) => isActiveTuntasStatus(tuntas.status)) ?? [], [auth?.tuntai]);
  const pendingTuntai = useMemo(() => auth?.tuntai.filter((tuntas) => !isActiveTuntasStatus(tuntas.status)) ?? [], [auth?.tuntai]);

  useEffect(() => {
    if (!auth || auth.type === "super_admin" || hasLoadedFreshTuntai) return;
    setHasLoadedFreshTuntai(true);
    void refreshTuntai().catch(() => undefined);
  }, [auth, hasLoadedFreshTuntai, refreshTuntai]);

  if (!auth) return <Navigate to="/login" replace />;
  if (auth.type === "super_admin") return <Navigate to="/admin" replace />;

  async function chooseTuntas(tuntasId: string) {
    setBusyId(tuntasId);
    setError(null);
    setMessage(null);
    try {
      const nextAuth = await selectTuntas(tuntasId);
      if (nextAuth?.activeTuntasId) {
        navigate("/", { replace: true });
      } else {
        setError("Tunto pasirinkimas neišsisaugojo. Atnaujink sąrašą ir bandyk dar kartą.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tunto pasirinkti nepavyko.");
    } finally {
      setBusyId(null);
    }
  }

  async function reloadTuntai() {
    setIsRefreshing(true);
    setError(null);
    setMessage(null);
    try {
      const nextAuth = await refreshTuntai();
      const hasActiveTuntai = nextAuth?.tuntai.some((tuntas) => isActiveTuntasStatus(tuntas.status)) ?? false;
      setMessage(hasActiveTuntai ? "Tuntų sąrašas atnaujintas." : "Tuntų sąrašas atnaujintas, bet aktyvių tuntų dar nėra.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tuntų sąrašo atnaujinti nepavyko.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError("Įveskite pakvietimo kodą.");
      return;
    }

    setIsAcceptingInvite(true);
    setError(null);
    setMessage(null);
    try {
      const nextAuth = await acceptInvitation(code);
      setInviteCode("");
      setMessage("Pakvietimas priimtas.");
      navigate(nextAuth.activeTuntasId ? "/" : "/tuntas", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Nepavyko priimti pakvietimo.");
    } finally {
      setIsAcceptingInvite(false);
    }
  }

  return (
    <main className="auth-form-page">
      <section className="form-panel auth-form-panel">
        <div className="form-section">
          <div className="form-section-heading">
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <h2>Pasirink tuntą</h2>
              <span>Šis žingsnis rodomas, kai turi kelis tuntus arba dar nėra aktyvaus tunto.</span>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}

          {activeTuntai.length > 0 && (
            <div className="tuntas-choice-list">
              {activeTuntai.map((tuntas) => (
                <TuntasChoice
                  key={tuntas.id}
                  tuntas={tuntas}
                  active
                  selected={auth.activeTuntasId === tuntas.id}
                  disabled={busyId === tuntas.id}
                  onSelect={() => void chooseTuntas(tuntas.id)}
                />
              ))}
            </div>
          )}

          {pendingTuntai.length > 0 && (
            <div className="tuntas-choice-list">
              <h3>Laukia patvirtinimo arba neaktyvūs</h3>
              {pendingTuntai.map((tuntas) => (
                <TuntasChoice key={tuntas.id} tuntas={tuntas} active={false} selected={false} disabled onSelect={() => undefined} />
              ))}
            </div>
          )}

          {activeTuntai.length === 0 && pendingTuntai.length === 0 && (
            <div className="empty-state compact-empty-state">
              <Clock size={28} aria-hidden="true" />
              <strong>Tuntų dar nėra</strong>
              <span>Jei ką tik sukūrei tuntą, jis atsiras čia kaip laukiantis patvirtinimo. Taip pat gali prisijungti su pakvietimu.</span>
            </div>
          )}

          <form className="invite-accept-panel" onSubmit={submitInvite}>
            <div className="form-section-heading compact-auth-heading">
              <TicketCheck size={19} aria-hidden="true" />
              <div>
                <h3>Prisijungti su pakvietimu</h3>
                <span>Įvesk tunto arba vieneto pakvietimo kodą, jeigu paskyrą jau turi.</span>
              </div>
            </div>
            <div className="inline-form-row">
              <label className="form-field">
                <span>Pakvietimo kodas</span>
                <input
                  autoComplete="one-time-code"
                  maxLength={20}
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                />
              </label>
              <button className="primary-button compact-primary-button" type="submit" disabled={isAcceptingInvite || !inviteCode.trim()}>
                {isAcceptingInvite ? "Priimama..." : "Priimti"}
              </button>
            </div>
          </form>

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => void reloadTuntai()} disabled={isRefreshing}>
              <RefreshCw size={17} aria-hidden="true" />
              {isRefreshing ? "Atnaujinama..." : "Atnaujinti"}
            </button>
            <button className="secondary-button" type="button" onClick={() => void logout()}>
              <LogOut size={17} aria-hidden="true" />
              Atsijungti
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function TuntasChoice({
  tuntas,
  active,
  selected,
  disabled,
  onSelect
}: {
  tuntas: UserTuntas;
  active: boolean;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`tuntas-choice${selected ? " selected" : ""}`} type="button" disabled={disabled} onClick={onSelect}>
      {active ? <CheckCircle2 size={18} aria-hidden="true" /> : <Clock size={18} aria-hidden="true" />}
      <span>
        <strong>{tuntas.name}</strong>
        <small>{tuntas.krastas || "Kraštas nenurodytas"} / {statusLabel(tuntas.status)}</small>
      </span>
    </button>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Aktyvus",
    APPROVED: "Aktyvus",
    PENDING: "Laukia patvirtinimo",
    REJECTED: "Atmestas",
    DELETED: "Ištrintas"
  };
  return labels[status] ?? status;
}
