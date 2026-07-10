import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, Plus, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { ItemCheckSession, Member, OrganizationalUnit } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  SkautaiDataTable,
  SkautaiEmptyState,
  SkautaiErrorState,
  SkautaiFormSection,
  SkautaiPageShell,
  SkautaiPanel,
  SkautaiStatusPill,
  SkautaiTabs,
  type SkautaiDataTableColumn
} from "../components/ui/Skautai";
import { countLabel } from "../utils/display";
import { hasPermission } from "../utils/permissions";

type AuditStatusFilter = "OPEN" | "COMPLETED" | "ALL";

type AuditScopeForm = {
  scope: string;
  type: string;
  category: string;
  personalOwnerUserId: string;
  notes: string;
};

const allScope = "__ALL__";
const sharedScope = "__SHARED__";

const emptyAuditForm: AuditScopeForm = {
  scope: allScope,
  type: "",
  category: "",
  personalOwnerUserId: "",
  notes: ""
};

export function InventoryAuditsPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ItemCheckSession[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>("OPEN");
  const [form, setForm] = useState<AuditScopeForm>(emptyAuditForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const permissions = auth?.permissions;
  const canView = hasPermission(permissions, "items.view");
  const canListUnits = hasPermission(permissions, "organizational_units.view");
  const canListMembers = hasPermission(permissions, "members.view");

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canView) {
      setSessions([]);
      setUnits([]);
      setMembers([]);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.listInventoryAuditSessions(auth.token, auth.activeTuntasId),
      canListUnits
        ? api.listOrganizationalUnits(auth.token, auth.activeTuntasId).then((response) => response.units).catch(() => [])
        : Promise.resolve([] as OrganizationalUnit[]),
      canListMembers
        ? api.listMembers(auth.token, auth.activeTuntasId).then((response) => response.members).catch(() => [])
        : Promise.resolve([] as Member[])
    ])
      .then(([sessionResponse, unitResponse, memberResponse]) => {
        if (isCancelled) return;
        setSessions(sessionResponse.sessions);
        setUnits(unitResponse);
        setMembers(memberResponse);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(errorMessage(cause, "Inventorizacijų įkelti nepavyko."));
          setSessions([]);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, canListMembers, canListUnits, canView, reloadKey]);

  const visibleSessions = useMemo(
    () => sessions
      .filter((session) => statusFilter === "ALL" || session.status === statusFilter)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [sessions, statusFilter]
  );
  const openCount = sessions.filter((session) => session.status === "OPEN").length;
  const completedCount = sessions.filter((session) => session.status === "COMPLETED").length;
  const sortedUnits = useMemo(
    () => [...units].sort((left, right) => left.name.localeCompare(right.name, "lt")),
    [units]
  );
  const sortedMembers = useMemo(
    () => [...members].sort((left, right) => memberName(left).localeCompare(memberName(right), "lt")),
    [members]
  );

  function openCreate() {
    setForm(emptyAuditForm);
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setIsFormOpen(false);
    setForm(emptyAuditForm);
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !canView) return;

    setIsSaving(true);
    setError(null);
    try {
      const session = await api.createInventoryAuditSession(auth.token, auth.activeTuntasId, {
        custodianId: form.scope !== allScope && form.scope !== sharedScope ? form.scope : null,
        type: optional(form.type),
        category: optional(form.category),
        sharedOnly: form.scope === sharedScope,
        personalOwnerUserId: optional(form.personalOwnerUserId),
        notes: optional(form.notes)
      });
      setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
      setIsFormOpen(false);
      setForm(emptyAuditForm);
      navigate(`/inventory/audits/${session.id}`);
    } catch (cause) {
      setError(errorMessage(cause, "Inventorizacijos pradėti nepavyko."));
    } finally {
      setIsSaving(false);
    }
  }

  const columns: Array<SkautaiDataTableColumn<ItemCheckSession>> = [
    {
      key: "audit",
      header: "Inventorizacija",
      cell: (session) => (
        <div className="table-title-cell">
          <span className="record-icon table-cell-icon"><ClipboardCheck size={18} aria-hidden="true" /></span>
          <div>
            <Link className="table-link" to={`/inventory/audits/${session.id}`}>
              {sessionScopeLabel(session)}
            </Link>
            <span>Pradėjo {session.startedByUserName ?? "narys"}</span>
            <span>{formatDateTime(session.createdAt)}</span>
          </div>
        </div>
      )
    },
    {
      key: "scope",
      header: "Apimtis",
      cell: (session) => (
        <>
          <strong>{session.scopeType ? itemTypeLabel(session.scopeType) : "Visi tipai"}</strong>
          <span>{session.scopeCategory || "Visos kategorijos"}</span>
        </>
      )
    },
    {
      key: "progress",
      header: "Pažanga",
      cell: (session) => (
        <>
          <strong>{session.summary.checked} / {session.summary.total}</strong>
          <span>{session.summary.unchecked} nepatikrinta</span>
        </>
      )
    },
    {
      key: "findings",
      header: "Radinių suvestinė",
      cell: (session) => (
        <>
          <strong>{session.summary.found} rasta</strong>
          <span>{session.summary.missing} trūksta · {session.summary.misplaced} ne vietoje · {session.summary.damaged} pažeista</span>
        </>
      )
    },
    {
      key: "status",
      header: "Būsena",
      cell: (session) => (
        <SkautaiStatusPill status={session.status} tone={session.status === "OPEN" ? "warning" : "success"}>
          {session.status === "OPEN" ? "Vykdoma" : "Užbaigta"}
        </SkautaiStatusPill>
      )
    }
  ];

  const actions = (
    <>
      {canView && (
        <button className="primary-button compact-primary-button" type="button" onClick={openCreate}>
          <Plus size={17} aria-hidden="true" />
          Pradėti inventorizaciją
        </button>
      )}
      <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading || !canView}>
        <RefreshCw size={17} aria-hidden="true" />
        Atnaujinti
      </button>
    </>
  );

  return (
    <SkautaiPageShell className="inventory-page" eyebrow="Inventorius" title="Inventorizacijos" actions={actions}>
      {error && <SkautaiErrorState description={error} />}

      {!canView ? (
        <SkautaiEmptyState
          icon={ClipboardCheck}
          title="Inventorizacijos nepasiekiamos"
          description="Inventorizacijoms reikia inventoriaus peržiūros teisės."
        />
      ) : (
        <>
          <SkautaiTabs
            label="Inventorizacijų būsena"
            activeTab={statusFilter}
            onChange={(value) => setStatusFilter(value as AuditStatusFilter)}
            tabs={[
              { id: "OPEN", label: "Vykdomos", count: openCount },
              { id: "COMPLETED", label: "Užbaigtos", count: completedCount },
              { id: "ALL", label: "Visos", count: sessions.length }
            ]}
          />

          <section className="data-panel" aria-busy={isLoading}>
            <div className="data-panel-header">
              <span>{visibleSessions.length} {countLabel(visibleSessions.length, "inventorizacija", "inventorizacijos", "inventorizacijų")}</span>
              <span>{statusFilter === "OPEN" ? "Dar nebaigti patikrinimai" : statusFilter === "COMPLETED" ? "Inventorizacijų istorija" : "Visi patikrinimai"}</span>
            </div>
            {isLoading && sessions.length === 0 ? (
              <div className="table-state">
                <Loader2 className="spin" size={22} aria-hidden="true" />
                Kraunamos inventorizacijos...
              </div>
            ) : (
              <SkautaiDataTable
                rows={visibleSessions}
                columns={columns}
                getRowKey={(session) => session.id}
                emptyState={(
                  <SkautaiEmptyState
                    compact
                    icon={ClipboardCheck}
                    title={statusFilter === "OPEN" ? "Vykdomų inventorizacijų nėra" : "Inventorizacijų istorija tuščia"}
                    description={statusFilter === "OPEN" ? "Pradėkite naują tikslinės saugyklos ar inventoriaus grupės patikrinimą." : "Užbaigtos inventorizacijos bus rodomos čia."}
                  />
                )}
              />
            )}
          </section>
        </>
      )}

      <SkautaiPanel
        open={isFormOpen}
        title="Pradėti inventorizaciją"
        description="Apibrėžkite saugyklą ir inventoriaus grupę, kurią tikrinsite."
        onClose={closeForm}
      >
        <form className="form-panel" onSubmit={createSession}>
          <fieldset disabled={isSaving}>
            <SkautaiFormSection title="Inventorizacijos apimtis" columns={2}>
              <label className="form-field">
                <span>Saugojimo sritis</span>
                <select value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))}>
                  <option value={allScope}>Visas matomas inventorius</option>
                  <option value={sharedScope}>Tik bendras tunto inventorius</option>
                  {sortedUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                </select>
                {!canListUnits && <small>Vienetų sąrašas nerodomas pagal turimas teises.</small>}
              </label>
              <label className="form-field">
                <span>Inventoriaus tipas</span>
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="">Visi tipai</option>
                  <option value="COLLECTIVE">Bendras</option>
                  <option value="ASSIGNED">Priskirtas</option>
                  <option value="INDIVIDUAL">Asmeninis</option>
                </select>
              </label>
              <label className="form-field">
                <span>Kategorija</span>
                <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Palikite tuščią visoms kategorijoms" />
              </label>
              <label className="form-field">
                <span>Asmeninio inventoriaus savininkas</span>
                <select value={form.personalOwnerUserId} onChange={(event) => setForm((current) => ({ ...current, personalOwnerUserId: event.target.value }))} disabled={!canListMembers}>
                  <option value="">Visi savininkai</option>
                  {sortedMembers.map((member) => <option key={member.userId} value={member.userId}>{memberName(member)}</option>)}
                </select>
                {!canListMembers && <small>Savininko filtro sąrašui reikia narių peržiūros teisės.</small>}
              </label>
              <label className="form-field wide">
                <span>Pastabos</span>
                <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Patikrinimo tikslas ar papildomos instrukcijos" />
              </label>
            </SkautaiFormSection>

            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={closeForm}>Atšaukti</button>
              <button className="primary-button compact-primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Pradedama..." : "Pradėti patikrinimą"}
              </button>
            </div>
          </fieldset>
        </form>
      </SkautaiPanel>
    </SkautaiPageShell>
  );
}

function sessionScopeLabel(session: ItemCheckSession) {
  if (session.scopeCustodianName) return session.scopeCustodianName;
  if (session.scopeSharedOnly) return "Bendras tunto inventorius";
  if (session.scopePersonalOwnerUserId) return "Asmeninis inventorius";
  return "Visas matomas inventorius";
}

function itemTypeLabel(value: string) {
  const labels: Record<string, string> = {
    COLLECTIVE: "Bendras",
    ASSIGNED: "Priskirtas",
    INDIVIDUAL: "Asmeninis"
  };
  return labels[value] ?? value;
}

function memberName(member: Member) {
  return [member.name, member.surname].filter(Boolean).join(" ") || member.email;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof ApiError || cause instanceof Error ? cause.message : fallback;
}
