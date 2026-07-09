import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Edit3, Loader2, Network, Plus, RefreshCw, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { InvitationResponse, OrganizationalUnit, Role } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  SkautaiCard,
  SkautaiDataTable,
  SkautaiEmptyState,
  SkautaiErrorState,
  SkautaiPageShell,
  SkautaiStatusPill,
  type SkautaiDataTableColumn
} from "../components/ui/Skautai";
import { countLabel, roleLabel } from "../utils/display";
import { canUseUnits, hasPermission } from "../utils/permissions";

type UnitForm = {
  name: string;
  type: string;
  subType: string;
  acceptedRankId: string;
};

type InviteForm = {
  roleId: string;
  organizationalUnitId: string;
  expiresInHours: string;
};

const emptyUnitForm: UnitForm = {
  name: "",
  type: "DRAUGOVE",
  subType: "",
  acceptedRankId: ""
};

const emptyInviteForm: InviteForm = {
  roleId: "",
  organizationalUnitId: "",
  expiresInHours: "48"
};

export function UnitsPage() {
  const { auth } = useAuth();
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnitForm);
  const [inviteForm, setInviteForm] = useState<InviteForm>(emptyInviteForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [latestInvite, setLatestInvite] = useState<InvitationResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const permissions = auth?.permissions;
  const canViewUnits = hasPermission(permissions, "organizational_units.view");
  const canManageUnits = hasPermission(permissions, "organizational_units.manage");
  const canCreateInvites = hasPermission(permissions, "invitations.create");
  const canOpenPage = canUseUnits(permissions);
  const canFetch = Boolean(auth?.token && auth.activeTuntasId && (canViewUnits || canManageUnits || canCreateInvites));

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canOpenPage) {
      setUnits([]);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      canViewUnits
        ? api.listOrganizationalUnits(auth.token, auth.activeTuntasId).catch(() => ({ units: [], total: 0 }))
        : Promise.resolve({ units: [], total: 0 }),
      (canManageUnits || canCreateInvites)
        ? api.listRoles(auth.token, auth.activeTuntasId).catch(() => ({ roles: [], total: 0 }))
        : Promise.resolve({ roles: [], total: 0 })
    ])
      .then(([unitResponse, roleResponse]) => {
        if (isCancelled) return;
        setUnits(unitResponse.units);
        setRoles(roleResponse.roles);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Vienetų užkrauti nepavyko.");
          setUnits([]);
          setRoles([]);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, canCreateInvites, canManageUnits, canOpenPage, canViewUnits, reloadKey]);

  const sortedUnits = useMemo(
    () => [...units].sort((left, right) => unitTypeLabel(left.type).localeCompare(unitTypeLabel(right.type), "lt") || left.name.localeCompare(right.name, "lt")),
    [units]
  );

  const rankRoles = useMemo(
    () => roles.filter((role) => role.roleType === "RANK").sort((left, right) => roleLabel(left.name).localeCompare(roleLabel(right.name), "lt")),
    [roles]
  );

  const inviteRoles = useMemo(
    () => roles
      .filter((role) => role.name !== "tuntininkas")
      .sort((left, right) => roleLabel(left.name).localeCompare(roleLabel(right.name), "lt")),
    [roles]
  );

  const totalMembers = sortedUnits.reduce((sum, unit) => sum + unit.memberCount, 0);
  const totalItems = sortedUnits.reduce((sum, unit) => sum + unit.itemCount, 0);

  function startEdit(unit: OrganizationalUnit) {
    setEditingId(unit.id);
    setUnitForm({
      name: unit.name,
      type: unit.type,
      subType: unit.subType ?? "",
      acceptedRankId: unit.acceptedRankId ?? ""
    });
    setMessage(null);
    setError(null);
  }

  function resetUnitForm() {
    setEditingId(null);
    setUnitForm(emptyUnitForm);
  }

  async function saveUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !canManageUnits) return;
    if (!unitForm.name.trim()) {
      setError("Įveskite vieneto pavadinimą.");
      return;
    }

    setIsSavingUnit(true);
    setMessage(null);
    setError(null);
    try {
      const saved = editingId
        ? await api.updateOrganizationalUnit(auth.token, auth.activeTuntasId, editingId, {
          name: unitForm.name.trim(),
          acceptedRankId: optional(unitForm.acceptedRankId)
        })
        : await api.createOrganizationalUnit(auth.token, auth.activeTuntasId, {
          name: unitForm.name.trim(),
          type: unitForm.type,
          subType: optional(unitForm.subType),
          acceptedRankId: optional(unitForm.acceptedRankId)
        });
      setUnits((current) => editingId
        ? current.map((unit) => unit.id === saved.id ? saved : unit)
        : [...current, saved]);
      resetUnitForm();
      setMessage(editingId ? "Vienetas atnaujintas." : "Vienetas sukurtas.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Vieneto išsaugoti nepavyko.");
    } finally {
      setIsSavingUnit(false);
    }
  }

  async function deleteUnit(unit: OrganizationalUnit) {
    if (!auth?.token || !auth.activeTuntasId || !canManageUnits) return;
    if (!window.confirm(`Ištrinti vienetą "${unit.name}"?`)) return;
    setBusyId(unit.id);
    setMessage(null);
    setError(null);
    try {
      await api.deleteOrganizationalUnit(auth.token, auth.activeTuntasId, unit.id);
      setUnits((current) => current.filter((item) => item.id !== unit.id));
      if (editingId === unit.id) resetUnitForm();
      setMessage("Vienetas ištrintas.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Vieneto ištrinti nepavyko.");
    } finally {
      setBusyId(null);
    }
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !canCreateInvites) return;
    if (!inviteForm.roleId) {
      setError("Pasirinkite rolę pakvietimui.");
      return;
    }

    setIsCreatingInvite(true);
    setMessage(null);
    setError(null);
    setLatestInvite(null);
    try {
      const invite = await api.createInvitation(auth.token, auth.activeTuntasId, {
        roleId: inviteForm.roleId,
        organizationalUnitId: optional(inviteForm.organizationalUnitId),
        expiresInHours: Math.max(1, Number(inviteForm.expiresInHours) || 48)
      });
      setLatestInvite(invite);
      setMessage("Pakvietimo kodas sukurtas.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Pakvietimo sukurti nepavyko.");
    } finally {
      setIsCreatingInvite(false);
    }
  }

  const actions = (
    <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={!canFetch || isLoading}>
      <RefreshCw size={17} aria-hidden="true" />
      Atnaujinti
    </button>
  );

  return (
    <SkautaiPageShell className="units-page" eyebrow="Organizacija" title="Vienetai" actions={actions}>
      {message && <p className="inline-success">{message}</p>}
      {error && <SkautaiErrorState description={error} />}

      {!canOpenPage ? (
        <SkautaiEmptyState
          icon={ShieldCheck}
          title="Vienetams reikia teisės"
          description="Šis ekranas rodomas tik vadovams, kurie gali matyti vienetus, juos valdyti arba kurti pakvietimus."
        />
      ) : (
        <>
          <section className="unit-summary-grid" aria-label="Vienetų suvestinė">
            <MetricTile label="Vienetai" value={sortedUnits.length} />
            <MetricTile label="Nariai vienetuose" value={totalMembers} />
            <MetricTile label="Inventoriaus įrašai" value={totalItems} />
          </section>

          <div className="inner-page-grid units-layout">
            <section className="data-panel">
              <div className="data-panel-header">
                <span>{sortedUnits.length} {countLabel(sortedUnits.length, "vienetas", "vienetai", "vienetų")}</span>
                <span>{canViewUnits ? "Tunto struktūra" : "Sąrašui reikia vienetų peržiūros teisės"}</span>
              </div>

              {!canViewUnits ? (
                <SkautaiEmptyState
                  compact
                  icon={ShieldCheck}
                  title="Sąrašas nepasiekiamas"
                  description="Vienetų sąrašui reikia organizacinių vienetų peržiūros teisės."
                />
              ) : isLoading && sortedUnits.length === 0 ? (
                <SkautaiEmptyState compact icon={Loader2} title="Kraunami vienetai" />
              ) : sortedUnits.length === 0 ? (
                <SkautaiEmptyState
                  compact
                  icon={UsersRound}
                  title="Vienetų dar nėra"
                  description="Sukurk draugoves, gildijas ar būrelius, kad nariai ir inventorius turėtų aiškų kontekstą."
                />
              ) : (
                <UnitsTable units={sortedUnits} canManageUnits={canManageUnits} busyId={busyId} onEdit={startEdit} onDelete={(unit) => void deleteUnit(unit)} />
              )}
            </section>

            <aside className="side-panel-stack">
              <SkautaiCard variant="dense">
                <UnitFormCard
                  canManageUnits={canManageUnits}
                  editingId={editingId}
                  isSaving={isSavingUnit}
                  rankRoles={rankRoles}
                  unitForm={unitForm}
                  onCancel={resetUnitForm}
                  onSubmit={saveUnit}
                  onUnitFormChange={setUnitForm}
                />
              </SkautaiCard>

              <SkautaiCard variant="dense">
                <InviteFormCard
                  canCreateInvites={canCreateInvites}
                  inviteForm={inviteForm}
                  inviteRoles={inviteRoles}
                  isCreatingInvite={isCreatingInvite}
                  latestInvite={latestInvite}
                  units={sortedUnits}
                  onInviteFormChange={setInviteForm}
                  onSubmit={createInvite}
                />
              </SkautaiCard>
            </aside>
          </div>
        </>
      )}
    </SkautaiPageShell>
  );
}

function UnitsTable({
  units,
  canManageUnits,
  busyId,
  onEdit,
  onDelete
}: {
  units: OrganizationalUnit[];
  canManageUnits: boolean;
  busyId: string | null;
  onEdit: (unit: OrganizationalUnit) => void;
  onDelete: (unit: OrganizationalUnit) => void;
}) {
  const columns: Array<SkautaiDataTableColumn<OrganizationalUnit>> = [
    {
      key: "unit",
      header: "Vienetas",
      cell: (unit) => (
        <div className="table-title-cell">
          <span className="record-icon table-cell-icon"><Network size={18} aria-hidden="true" /></span>
          <div>
            <strong>{unit.name}</strong>
            <span>{unit.subType ? unitSubtypeLabel(unit.subType) : "Be potipio"}</span>
            {unit.acceptedRankName && <span>Priima: {roleLabel(unit.acceptedRankName)}</span>}
          </div>
        </div>
      )
    },
    {
      key: "type",
      header: "Tipas",
      cell: (unit) => <SkautaiStatusPill tone="info">{unitTypeLabel(unit.type)}</SkautaiStatusPill>
    },
    {
      key: "members",
      header: "Nariai",
      cell: (unit) => (
        <>
          <strong>{unit.memberCount}</strong>
          <span>{countLabel(unit.memberCount, "narys", "nariai", "narių")}</span>
        </>
      )
    },
    {
      key: "items",
      header: "Inventorius",
      cell: (unit) => (
        <>
          <strong>{unit.itemCount}</strong>
          <span>{countLabel(unit.itemCount, "įrašas", "įrašai", "įrašų")}</span>
        </>
      )
    },
    {
      key: "actions",
      header: "",
      className: "table-actions-cell",
      cell: (unit) => canManageUnits ? (
        <div className="row-actions">
          <button className="icon-button" type="button" title="Redaguoti" onClick={() => onEdit(unit)}>
            <Edit3 size={17} aria-hidden="true" />
          </button>
          <button className="icon-button danger-icon-button" type="button" title="Ištrinti" disabled={busyId === unit.id} onClick={() => onDelete(unit)}>
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      ) : null
    }
  ];

  return <SkautaiDataTable rows={units} columns={columns} getRowKey={(unit) => unit.id} />;
}

function UnitFormCard({
  canManageUnits,
  editingId,
  isSaving,
  rankRoles,
  unitForm,
  onCancel,
  onSubmit,
  onUnitFormChange
}: {
  canManageUnits: boolean;
  editingId: string | null;
  isSaving: boolean;
  rankRoles: Role[];
  unitForm: UnitForm;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUnitFormChange: (value: UnitForm | ((current: UnitForm) => UnitForm)) => void;
}) {
  return (
    <form className="form-panel unit-card-form" onSubmit={onSubmit}>
      <div className="form-section-heading">
        <Plus size={20} aria-hidden="true" />
        <div>
          <h3>{editingId ? "Redaguoti vienetą" : "Naujas vienetas"}</h3>
          <span>{canManageUnits ? "Kurk draugoves, gildijas ir būrelius pagal tunto struktūrą." : "Vienetus keisti gali tik tam teisę turintys vadovai."}</span>
        </div>
      </div>
      <fieldset disabled={!canManageUnits || isSaving}>
        <div className="form-grid one-column-grid">
          <TextField label="Pavadinimas *" value={unitForm.name} onChange={(value) => onUnitFormChange((current) => ({ ...current, name: value }))} required />
          <label className="form-field">
            <span>Tipas</span>
            <select value={unitForm.type} disabled={Boolean(editingId)} onChange={(event) => onUnitFormChange((current) => ({ ...current, type: event.target.value }))}>
              <option value="DRAUGOVE">Draugovė</option>
              <option value="GILDIJA">Gildija</option>
              <option value="BURELIS">Būrelis</option>
            </select>
          </label>
          <label className="form-field">
            <span>Potipis</span>
            <select value={unitForm.subType} disabled={Boolean(editingId)} onChange={(event) => onUnitFormChange((current) => ({ ...current, subType: event.target.value }))}>
              <option value="">Nenurodyta</option>
              <option value="VILKAI">Vilkų</option>
              <option value="SKAUTAI">Skautų</option>
              <option value="PATYRE_SKAUTAI">Patyrusių skautų</option>
              <option value="VYR_SKAUTAI">Vyr. skautų / skaučių</option>
              <option value="VADOVAI">Vadovų</option>
            </select>
          </label>
          <label className="form-field">
            <span>Priimamas patyrimo laipsnis</span>
            <select value={unitForm.acceptedRankId} onChange={(event) => onUnitFormChange((current) => ({ ...current, acceptedRankId: event.target.value }))}>
              <option value="">Netaikoma</option>
              {rankRoles.map((role) => (
                <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button className="primary-button compact-primary-button" type="submit">
            {isSaving ? "Saugoma..." : editingId ? "Išsaugoti" : "Sukurti"}
          </button>
          {editingId && <button className="secondary-button" type="button" onClick={onCancel}>Atšaukti</button>}
        </div>
      </fieldset>
    </form>
  );
}

function InviteFormCard({
  canCreateInvites,
  inviteForm,
  inviteRoles,
  isCreatingInvite,
  latestInvite,
  units,
  onInviteFormChange,
  onSubmit
}: {
  canCreateInvites: boolean;
  inviteForm: InviteForm;
  inviteRoles: Role[];
  isCreatingInvite: boolean;
  latestInvite: InvitationResponse | null;
  units: OrganizationalUnit[];
  onInviteFormChange: (value: InviteForm | ((current: InviteForm) => InviteForm)) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="form-panel unit-card-form" onSubmit={onSubmit}>
      <div className="form-section-heading">
        <ClipboardCopy size={20} aria-hidden="true" />
        <div>
          <h3>Pakvietimo kodas</h3>
          <span>{canCreateInvites ? "Sukurk kodą nariui arba vadovui prisijungti prie tunto/vieneto." : "Pakvietimus kurti gali tik tam teisę turintys vadovai."}</span>
        </div>
      </div>
      <fieldset disabled={!canCreateInvites || isCreatingInvite}>
        <div className="form-grid one-column-grid">
          <label className="form-field">
            <span>Rolė *</span>
            <select value={inviteForm.roleId} onChange={(event) => onInviteFormChange((current) => ({ ...current, roleId: event.target.value }))} required>
              <option value="">Pasirinkite rolę</option>
              {inviteRoles.map((role) => (
                <option key={role.id} value={role.id}>{roleLabel(role.name)} ({role.roleType === "RANK" ? "laipsnis" : "pareigos"})</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Vienetas</span>
            <select value={inviteForm.organizationalUnitId} onChange={(event) => onInviteFormChange((current) => ({ ...current, organizationalUnitId: event.target.value }))}>
              <option value="">Tunto lygmuo</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
          </label>
          <TextField label="Galioja valandų" type="number" value={inviteForm.expiresInHours} onChange={(value) => onInviteFormChange((current) => ({ ...current, expiresInHours: value }))} />
        </div>
        <button className="primary-button compact-primary-button" type="submit">
          {isCreatingInvite ? "Kuriama..." : "Sukurti kodą"}
        </button>
      </fieldset>
      {latestInvite && (
        <div className="invite-code-card">
          <span>Pakvietimo kodas</span>
          <strong>{latestInvite.code}</strong>
          <small>{latestInvite.tuntasName}{latestInvite.organizationalUnitName ? ` / ${latestInvite.organizationalUnitName}` : ""} / {roleLabel(latestInvite.roleName)}</small>
        </div>
      )}
    </form>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="unit-summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function unitTypeLabel(type: string) {
  const labels: Record<string, string> = {
    DRAUGOVE: "Draugovė",
    GILDIJA: "Gildija",
    BURELIS: "Būrelis"
  };
  return labels[type] ?? type;
}

function unitSubtypeLabel(subtype: string) {
  const labels: Record<string, string> = {
    VILKAI: "Vilkų",
    SKAUTAI: "Skautų",
    PATYRE_SKAUTAI: "Patyrusių skautų",
    VYR_SKAUTAI: "Vyr. skautų / skaučių",
    VADOVAI: "Vadovų"
  };
  return labels[subtype] ?? subtype;
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
