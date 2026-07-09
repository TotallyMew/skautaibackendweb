import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Edit3, Loader2, Plus, RefreshCw, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { InvitationResponse, OrganizationalUnit, Role } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { roleLabel } from "../utils/display";
import { hasPermission } from "../utils/permissions";

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
  const canFetch = Boolean(auth?.token && auth.activeTuntasId && canViewUnits);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canViewUnits) {
      setUnits([]);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.listOrganizationalUnits(auth.token, auth.activeTuntasId),
      api.listRoles(auth.token, auth.activeTuntasId).catch(() => ({ roles: [], total: 0 }))
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
  }, [auth?.activeTuntasId, auth?.token, canViewUnits, reloadKey]);

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
    if (!unitForm.name.trim()) return setError("Įveskite vieneto pavadinimą.");

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
    if (!inviteForm.roleId) return setError("Pasirinkite rolę pakvietimui.");

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

  return (
    <section className="units-page">
      <div className="page-heading-row">
        <div>
          <span className="section-kicker">ORGANIZACIJA</span>
          <h2>Vienetai</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={!canFetch || isLoading}>
          <RefreshCw size={17} aria-hidden="true" />
          Atnaujinti
        </button>
      </div>

      {message && <p className="inline-success">{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="inner-page-grid">
        <section className="data-panel">
          <div className="record-header unit-row">
            <span>VIENETAS</span>
            <span>NARIAI</span>
            <span>INVENTORIUS</span>
            <span></span>
          </div>

          {!canViewUnits && (
            <div className="empty-state compact-empty-state">
              <ShieldCheck size={28} aria-hidden="true" />
              <strong>Vienetams reikia teisės</strong>
              <span>Šis ekranas rodomas tik vadovams, kurie gali matyti organizacijos vienetus.</span>
            </div>
          )}

          {canViewUnits && isLoading && units.length === 0 ? (
            <div className="empty-state compact-empty-state">
              <Loader2 className="spin-icon" size={28} aria-hidden="true" />
              <strong>Kraunami vienetai</strong>
            </div>
          ) : null}

          {canViewUnits && !isLoading && sortedUnits.length === 0 ? (
            <div className="empty-state compact-empty-state">
              <UsersRound size={28} aria-hidden="true" />
              <strong>Vienetų dar nėra</strong>
              <span>Sukurk draugoves, gildijas ar būrelius, kad nariai ir inventorius turėtų aiškų kontekstą.</span>
            </div>
          ) : null}

          {canViewUnits && sortedUnits.length > 0 && (
            <div className="record-list">
              {sortedUnits.map((unit) => (
                <article className="record-row unit-row" key={unit.id}>
                  <div className="record-main">
                    <strong className="record-title">{unit.name}</strong>
                    <span className="mini-chip unit-type-chip">{unitTypeLabel(unit.type)}</span>
                    <span className="muted-line unit-subtype-line">{unit.subType ? unitSubtypeLabel(unit.subType) : "Be potipio"}</span>
                    {unit.acceptedRankName && <span className="muted-line">Priima: {roleLabel(unit.acceptedRankName)}</span>}
                  </div>
                  <div className="record-meta">
                    <strong>{unit.memberCount}</strong>
                    <span>nariai</span>
                  </div>
                  <div className="record-meta">
                    <strong>{unit.itemCount}</strong>
                    <span>įrašai</span>
                  </div>
                  <div className="row-actions">
                    {canManageUnits && (
                      <>
                        <button className="icon-button" type="button" title="Redaguoti" onClick={() => startEdit(unit)}>
                          <Edit3 size={17} aria-hidden="true" />
                        </button>
                        <button className="icon-button danger-icon-button" type="button" title="Ištrinti" disabled={busyId === unit.id} onClick={() => void deleteUnit(unit)}>
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="side-panel-stack">
          <form className="form-section" onSubmit={saveUnit}>
            <div className="form-section-heading">
              <Plus size={20} aria-hidden="true" />
              <div>
                <h3>{editingId ? "Redaguoti vienetą" : "Naujas vienetas"}</h3>
                <span>{canManageUnits ? "Kurk draugoves, gildijas ir būrelius pagal tunto struktūrą." : "Vienetus keisti gali tik tam teisę turintys vadovai."}</span>
              </div>
            </div>
            <fieldset disabled={!canManageUnits || isSavingUnit}>
              <div className="form-grid one-column-grid">
                <TextField label="Pavadinimas *" value={unitForm.name} onChange={(value) => setUnitForm((current) => ({ ...current, name: value }))} required />
                <label className="form-field">
                  <span>Tipas</span>
                  <select value={unitForm.type} disabled={Boolean(editingId)} onChange={(event) => setUnitForm((current) => ({ ...current, type: event.target.value }))}>
                    <option value="DRAUGOVE">Draugovė</option>
                    <option value="GILDIJA">Gildija</option>
                    <option value="BURELIS">Būrelis</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Potipis</span>
                  <select value={unitForm.subType} disabled={Boolean(editingId)} onChange={(event) => setUnitForm((current) => ({ ...current, subType: event.target.value }))}>
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
                  <select value={unitForm.acceptedRankId} onChange={(event) => setUnitForm((current) => ({ ...current, acceptedRankId: event.target.value }))}>
                    <option value="">Netaikoma</option>
                    {rankRoles.map((role) => (
                      <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button className="primary-button compact-primary-button" type="submit">
                  {isSavingUnit ? "Saugoma..." : editingId ? "Išsaugoti" : "Sukurti"}
                </button>
                {editingId && <button className="secondary-button" type="button" onClick={resetUnitForm}>Atšaukti</button>}
              </div>
            </fieldset>
          </form>

          <form className="form-section" onSubmit={createInvite}>
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
                  <select value={inviteForm.roleId} onChange={(event) => setInviteForm((current) => ({ ...current, roleId: event.target.value }))} required>
                    <option value="">Pasirinkite rolę</option>
                    {inviteRoles.map((role) => (
                      <option key={role.id} value={role.id}>{roleLabel(role.name)} ({role.roleType === "RANK" ? "laipsnis" : "pareigos"})</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Vienetas</span>
                  <select value={inviteForm.organizationalUnitId} onChange={(event) => setInviteForm((current) => ({ ...current, organizationalUnitId: event.target.value }))}>
                    <option value="">Tunto lygmuo</option>
                    {sortedUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </label>
                <TextField label="Galioja valandų" type="number" value={inviteForm.expiresInHours} onChange={(value) => setInviteForm((current) => ({ ...current, expiresInHours: value }))} />
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
        </aside>
      </div>
    </section>
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
