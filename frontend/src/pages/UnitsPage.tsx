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
  type: "SKAUTU_DRAUGOVE",
  subType: "",
  acceptedRankId: ""
};

const emptyInviteForm: InviteForm = {
  roleId: "",
  organizationalUnitId: "",
  expiresInHours: "48"
};

const unitTypeOptions = [
  { value: "VILKU_DRAUGOVE", label: "Vilkų draugovė" },
  { value: "SKAUTU_DRAUGOVE", label: "Skautų draugovė" },
  { value: "PATYRUSIU_SKAUTU_DRAUGOVE", label: "Patyrusių skautų draugovė" },
  { value: "GILDIJA", label: "Gildija" },
  { value: "VYR_SKAUTU_VIENETAS", label: "Vyr. skautų draugovė / būrelis" },
  { value: "VYR_SKAUCIU_VIENETAS", label: "Vyr. skaučių draugovė / būrelis" }
];

const seniorSubtypeOptions = [
  { value: "DRAUGOVE", label: "Draugovė" },
  { value: "BURELIS", label: "Būrelis" }
];

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
    () => [...units].sort((left, right) => unitTypeSortOrder(left) - unitTypeSortOrder(right) || unitDisplayTypeLabel(left).localeCompare(unitDisplayTypeLabel(right), "lt") || left.name.localeCompare(right.name, "lt")),
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
          subType: normalizeUnitSubtype(unitForm.type, unitForm.subType),
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
      cell: (unit) => {
        const paletteClass = unitPaletteClass(unit);
        return (
        <div className="table-title-cell">
          <span className={`record-icon table-cell-icon unit-type-icon ${paletteClass}`}><Network size={18} aria-hidden="true" /></span>
          <div>
            <strong>{unit.name}</strong>
            <span>{unitSecondaryLabel(unit)}</span>
            {unit.acceptedRankName && (
              <SkautaiStatusPill className={`unit-rank-pill ${paletteClass}`}>
                Priima: {roleLabel(unit.acceptedRankName)}
              </SkautaiStatusPill>
            )}
          </div>
        </div>
        );
      }
    },
    {
      key: "type",
      header: "Tipas",
      cell: (unit) => <SkautaiStatusPill className={`unit-type-pill ${unitPaletteClass(unit)}`}>{unitDisplayTypeLabel(unit)}</SkautaiStatusPill>
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

  return (
    <SkautaiDataTable
      className="units-data-table"
      rows={units}
      columns={columns}
      getRowKey={(unit) => unit.id}
      getRowClassName={(unit) => `unit-table-row ${unitPaletteClass(unit)}`}
    />
  );
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
            <select
              value={unitForm.type}
              disabled={Boolean(editingId)}
              onChange={(event) => onUnitFormChange((current) => {
                const nextType = event.target.value;
                return {
                  ...current,
                  type: nextType,
                  subType: isSeniorUnitType(nextType) ? current.subType || "DRAUGOVE" : ""
                };
              })}
            >
              {unitTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          {isSeniorUnitType(unitForm.type) && (
            <label className="form-field">
              <span>Potipis</span>
              <select value={unitForm.subType || "DRAUGOVE"} disabled={Boolean(editingId)} onChange={(event) => onUnitFormChange((current) => ({ ...current, subType: event.target.value }))}>
                {seniorSubtypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
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

type UnitTone = "patyre" | "skautai" | "vilkai" | "gildija" | "vyr-skautai" | "vyr-skautes" | "default";

function unitPaletteClass(unit: OrganizationalUnit) {
  return `unit-palette-${resolveUnitTone(unit)}`;
}

function resolveUnitTone(unit: OrganizationalUnit): UnitTone {
  switch (unit.type) {
    case "PATYRUSIU_SKAUTU_DRAUGOVE":
      return "patyre";
    case "SKAUTU_DRAUGOVE":
      return "skautai";
    case "VILKU_DRAUGOVE":
      return "vilkai";
    case "GILDIJA":
      return "gildija";
    case "VYR_SKAUTU_VIENETAS":
      return "vyr-skautai";
    case "VYR_SKAUCIU_VIENETAS":
      return "vyr-skautes";
    default:
      break;
  }

  switch (unit.subType) {
    case "PATYRE_SKAUTAI":
      return "patyre";
    case "SKAUTAI":
      return "skautai";
    case "VILKAI":
      return "vilkai";
    case "VADOVAI":
      return "gildija";
    case "VYR_SKAUTAI":
      return "vyr-skautai";
    case "VYR_SKAUTES":
      return "vyr-skautes";
    default:
      return "default";
  }
}

function unitTypeSortOrder(unit: OrganizationalUnit) {
  const order: Record<UnitTone, number> = {
    "vyr-skautai": 0,
    "vyr-skautes": 1,
    gildija: 2,
    patyre: 3,
    skautai: 4,
    vilkai: 5,
    default: 6
  };
  return order[resolveUnitTone(unit)];
}

function unitDisplayTypeLabel(unit: OrganizationalUnit) {
  switch (unit.type) {
    case "VILKU_DRAUGOVE":
      return "Vilkų draugovė";
    case "SKAUTU_DRAUGOVE":
      return "Skautų draugovė";
    case "PATYRUSIU_SKAUTU_DRAUGOVE":
      return "Patyrusių skautų draugovė";
    case "GILDIJA":
      return "Gildija";
    case "VYR_SKAUTU_VIENETAS":
      return `Vyr. skautų ${seniorUnitKindLabel(unit.subType)}`;
    case "VYR_SKAUCIU_VIENETAS":
      return `Vyr. skaučių ${seniorUnitKindLabel(unit.subType)}`;
    case "DRAUGOVE":
      return `${legacyAgeGroupLabel(unit.subType)} draugovė`;
    case "BURELIS":
      return `${legacyAgeGroupLabel(unit.subType)} būrelis`;
    default:
      return unit.type;
  }
}

function unitSecondaryLabel(unit: OrganizationalUnit) {
  if (isSeniorUnitType(unit.type)) return unitSubtypeLabel(unit.subType || "DRAUGOVE");
  if (unit.type === "GILDIJA") return "Vadovų vienetas";
  if (unit.type.endsWith("_DRAUGOVE")) return "Draugovė";
  if (unit.type === "DRAUGOVE" || unit.type === "BURELIS") return unitSubtypeLabel(unit.subType || unit.type);
  return "Tunto vienetas";
}

function unitSubtypeLabel(subtype: string) {
  const labels: Record<string, string> = {
    DRAUGOVE: "Draugovė",
    BURELIS: "Būrelis",
    VILKAI: "Vilkų",
    SKAUTAI: "Skautų",
    PATYRE_SKAUTAI: "Patyrusių skautų",
    VYR_SKAUTAI: "Vyr. skautų / skaučių",
    VYR_SKAUTES: "Vyr. skaučių",
    VADOVAI: "Vadovų"
  };
  return labels[subtype] ?? subtype;
}

function legacyAgeGroupLabel(subtype?: string | null) {
  if (!subtype) return "Tunto";
  return unitSubtypeLabel(subtype);
}

function seniorUnitKindLabel(subtype?: string | null) {
  return subtype === "BURELIS" ? "būrelis" : "draugovė";
}

function isSeniorUnitType(type: string) {
  return type === "VYR_SKAUTU_VIENETAS" || type === "VYR_SKAUCIU_VIENETAS";
}

function normalizeUnitSubtype(type: string, subtype: string) {
  if (!isSeniorUnitType(type)) return null;
  return subtype === "BURELIS" ? "BURELIS" : "DRAUGOVE";
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
