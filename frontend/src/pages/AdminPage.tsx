import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Loader2, RefreshCw, Send, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { AdminTuntas } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { statusLabel } from "../utils/display";

type NoticeState = {
  title: string;
  body: string;
  tuntasId: string;
};

const initialNotice: NoticeState = {
  title: "",
  body: "",
  tuntasId: ""
};

export function AdminPage() {
  const { auth } = useAuth();
  const [tuntai, setTuntai] = useState<AdminTuntas[]>([]);
  const [notice, setNotice] = useState(initialNotice);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = auth?.type === "super_admin";
  const canFetch = Boolean(auth?.token && isSuperAdmin);

  useEffect(() => {
    if (!auth?.token || !isSuperAdmin) {
      setTuntai([]);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .listAdminTuntai(auth.token)
      .then((response) => {
        if (!isCancelled) {
          setTuntai(response);
        }
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(errorMessage(cause, "Nepavyko užkrauti tuntų sąrašo."));
          setTuntai([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.token, isSuperAdmin, reloadKey]);

  const counts = useMemo(() => summarizeTuntai(tuntai), [tuntai]);
  const sortedTuntai = useMemo(() => {
    const order: Record<string, number> = { PENDING: 0, ACTIVE: 1, REJECTED: 2, DELETED: 3 };
    return [...tuntai].sort((left, right) => (order[left.status] ?? 9) - (order[right.status] ?? 9) || left.name.localeCompare(right.name, "lt"));
  }, [tuntai]);

  async function refresh() {
    setReloadKey((value) => value + 1);
  }

  async function updateTuntas(tuntas: AdminTuntas, action: "approve" | "reject" | "delete") {
    if (!auth?.token) return;
    if (action === "delete" && !window.confirm(`Pažymėti tuntą "${tuntas.name}" kaip ištrintą?`)) return;

    setBusyId(tuntas.id);
    setMessage(null);
    setError(null);

    try {
      const result = action === "approve"
        ? await api.approveTuntas(auth.token, tuntas.id)
        : action === "reject"
          ? await api.rejectTuntas(auth.token, tuntas.id)
          : await api.deleteTuntas(auth.token, tuntas.id);
      setMessage(result.message);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause, "Veiksmo atlikti nepavyko."));
    } finally {
      setBusyId(null);
    }
  }

  async function sendNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !notice.title.trim() || !notice.body.trim()) return;

    setIsSending(true);
    setMessage(null);
    setError(null);

    try {
      const result = await api.sendSuperAdminNotification(auth.token, {
        title: notice.title.trim(),
        body: notice.body.trim(),
        tuntasId: notice.tuntasId || null
      });
      setMessage(result.message);
      setNotice(initialNotice);
    } catch (cause) {
      setError(errorMessage(cause, "Pranešimo išsiųsti nepavyko."));
    } finally {
      setIsSending(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <section className="work-area">
        <ShieldCheck size={34} aria-hidden="true" />
        <div>
          <h2>Reikalingos superadministratoriaus teisės</h2>
          <p>Ši darbo vieta skirta tvirtinti tuntus, prižiūrėti sistemos būseną ir siųsti globalius pranešimus.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Sistemos valdymas</span>
          <h2>Administravimas</h2>
        </div>
        <button className="secondary-button" type="button" onClick={refresh} disabled={!canFetch || isLoading}>
          <RefreshCw size={17} aria-hidden="true" />
          Atnaujinti
        </button>
      </div>

      {(error || message) && (
        <div className={error ? "inline-alert" : "inline-success"}>
          {error ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          <span>{error ?? message}</span>
        </div>
      )}

      <div className="admin-summary-grid">
        <AdminMetric label="Visi tuntai" value={tuntai.length} />
        <AdminMetric label="Laukia tvirtinimo" value={counts.pending} tone="warning" />
        <AdminMetric label="Aktyvūs" value={counts.active} tone="success" />
        <AdminMetric label="Atmesti / ištrinti" value={counts.inactive} />
      </div>

      <div className="admin-layout">
        <section className="data-panel admin-tuntai-panel">
          <div className="data-panel-header">
            <span>Tuntai</span>
            <span>{sortedTuntai.length} įrašai</span>
          </div>

          {isLoading && (
            <div className="table-state">
              <Loader2 className="spin" size={22} aria-hidden="true" />
              Kraunami tuntai...
            </div>
          )}

          {!isLoading && sortedTuntai.length === 0 && (
            <div className="empty-state">
              <ShieldCheck size={28} aria-hidden="true" />
              <strong>Tuntų dar nėra</strong>
              <span>Kai organizacijos registruosis, jų tvirtinimo būsena atsiras čia.</span>
            </div>
          )}

          {!isLoading && sortedTuntai.length > 0 && (
            <div className="record-list admin-record-list">
              <div className="record-header admin-record-row">
                <span></span>
                <span>Tuntas</span>
                <span>Kraštas</span>
                <span>Būsena</span>
                <span>Veiksmai</span>
              </div>
              {sortedTuntai.map((tuntas) => (
                <article className="record-row admin-record-row" key={tuntas.id}>
                  <span className="record-icon">{initials(tuntas.name)}</span>
                  <div className="record-main">
                    <strong className="record-title">{tuntas.name}</strong>
                    <span>{tuntas.contactEmail || "Kontaktinis el. paštas nenurodytas"}</span>
                  </div>
                  <div className="record-meta record-location">
                    <strong>{tuntas.krastas || "Nenurodyta"}</strong>
                    <span>{tuntas.id}</span>
                  </div>
                  <StatusBadge status={tuntas.status} />
                  <div className="admin-row-actions">
                    {tuntas.status === "PENDING" && (
                      <>
                        <button className="icon-button success-icon-button" type="button" title="Patvirtinti" onClick={() => void updateTuntas(tuntas, "approve")} disabled={busyId === tuntas.id}>
                          <CheckCircle2 size={17} aria-hidden="true" />
                        </button>
                        <button className="icon-button danger-icon-button" type="button" title="Atmesti" onClick={() => void updateTuntas(tuntas, "reject")} disabled={busyId === tuntas.id}>
                          <XCircle size={17} aria-hidden="true" />
                        </button>
                      </>
                    )}
                    {tuntas.status !== "DELETED" && (
                      <button className="icon-button danger-icon-button" type="button" title="Ištrinti" onClick={() => void updateTuntas(tuntas, "delete")} disabled={busyId === tuntas.id}>
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <form className="form-section admin-notice-panel" onSubmit={sendNotice}>
          <div className="form-section-heading">
            <Bell size={20} aria-hidden="true" />
            <div>
              <h3>Pranešimas</h3>
              <span>Siųsk pranešimą visiems aktyviems vartotojams arba konkrečiam tuntui.</span>
            </div>
          </div>

          <label className="form-field">
            <span>Gavėjai</span>
            <select value={notice.tuntasId} onChange={(event) => setNotice((current) => ({ ...current, tuntasId: event.target.value }))}>
              <option value="">Visi aktyvūs tuntai</option>
              {tuntai.filter((tuntas) => tuntas.status === "ACTIVE").map((tuntas) => (
                <option key={tuntas.id} value={tuntas.id}>{tuntas.name}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Pavadinimas</span>
            <input maxLength={120} value={notice.title} onChange={(event) => setNotice((current) => ({ ...current, title: event.target.value }))} required />
          </label>

          <label className="form-field">
            <span>Tekstas</span>
            <textarea maxLength={1000} rows={5} value={notice.body} onChange={(event) => setNotice((current) => ({ ...current, body: event.target.value }))} required />
          </label>

          <div className="form-actions">
            <button className="primary-button compact-primary-button" type="submit" disabled={isSending || !notice.title.trim() || !notice.body.trim()}>
              <Send size={17} aria-hidden="true" />
              {isSending ? "Siunčiama..." : "Siųsti"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function AdminMetric({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  return (
    <article className={`admin-metric-card${tone ? ` ${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}

function summarizeTuntai(tuntai: AdminTuntas[]) {
  return tuntai.reduce(
    (counts, tuntas) => {
      if (tuntas.status === "PENDING") counts.pending += 1;
      if (tuntas.status === "ACTIVE") counts.active += 1;
      if (tuntas.status === "REJECTED" || tuntas.status === "DELETED") counts.inactive += 1;
      return counts;
    },
    { pending: 0, active: 0, inactive: 0 }
  );
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("lt-LT"))
    .join("") || "T";
}

function errorMessage(cause: unknown, fallback: string) {
  if (cause instanceof ApiError || cause instanceof Error) return cause.message;
  return fallback;
}
