import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Edit3, Loader2, Network, Plus, RefreshCw, ShieldCheck, Trash2, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { InvitationResponse, InvitationRoleOption, Member, OrganizationalUnit, Role, UnitMembership } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  SkautaiConfirmDialog,
  SkautaiDataTable,
  SkautaiEmptyState,
  SkautaiErrorState,
  SkautaiPageShell,
  SkautaiPanel,
  SkautaiStatusPill,
  type SkautaiDataTableColumn
} from "../components/ui/Skautai";
import { assignmentTypeLabel, countLabel, roleLabel } from "../utils/display";
import { canUseUnits, hasPermission } from "../utils/permissions";
import { unitPaletteClass, unitTypeSortOrder } from "../utils/unitPalette";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invitationRoleOptions, setInvitationRoleOptions] = useState<InvitationRoleOption[]>([]);
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnitForm);
  const [inviteForm, setInviteForm] = useState<InviteForm>(emptyInviteForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUnitPanelOpen, setIsUnitPanelOpen] = useState(false);
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
  const [managedUnit, setManagedUnit] = useState<OrganizationalUnit | null>(null);
  const [unitMembers, setUnitMembers] = useState<UnitMembership[]>([]);
  const [tuntasMembers, setTuntasMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedAssignmentType, setSelectedAssignmentType] = useState<"MEMBER" | "VADOVO_PADEJEJAS">("MEMBER");
  const [memberToRemove, setMemberToRemove] = useState<UnitMembership | null>(null);
  const [unitMembersReloadKey, setUnitMembersReloadKey] = useState(0);
  const [isLoadingUnitMembers, setIsLoadingUnitMembers] = useState(false);
  const [unitMemberBusy, setUnitMemberBusy] = useState<string | null>(null);
  const [unitMemberMessage, setUnitMemberMessage] = useState<string | null>(null);
  const [unitMemberError, setUnitMemberError] = useState<string | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<OrganizationalUnit | null>(null);
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
  const canManageAllUnitMembers = permissions?.includes("unit.members.manage:ALL") ?? false;
  const canManageOwnUnitMembers = permissions?.includes("unit.members.manage:OWN_UNIT") ?? false;
  const canManageUnitMembers = canManageAllUnitMembers || canManageOwnUnitMembers;
  const canCreateInvites = hasPermission(permissions, "invitations.create");
  const canOpenPage = canUseUnits(permissions);
  const canFetch = Boolean(auth?.token && auth.activeTuntasId && (canViewUnits || canManageUnits || canManageUnitMembers || canCreateInvites));

  useEffect(() => {
    if (searchParams.get("panel") === "invite" && canCreateInvites) {
      setIsInvitePanelOpen(true);
    }
  }, [canCreateInvites, searchParams]);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canOpenPage) {
      setUnits([]);
      setRoles([]);
      setInvitationRoleOptions([]);
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
      canManageUnits
        ? api.listRoles(auth.token, auth.activeTuntasId).catch(() => ({ roles: [], total: 0 }))
        : Promise.resolve({ roles: [], total: 0 }),
      canCreateInvites
        ? api.getInvitationOptions(auth.token, auth.activeTuntasId).catch(() => ({ roles: [] }))
        : Promise.resolve({ roles: [] })
    ])
      .then(([unitResponse, roleResponse, invitationOptionsResponse]) => {
        if (isCancelled) return;
        setUnits(unitResponse.units.map(normalizeUnitCounts));
        setRoles(roleResponse.roles);
        setInvitationRoleOptions(invitationOptionsResponse.roles);
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

  const managedUnitId = managedUnit?.id ?? null;

  useEffect(() => {
    if (!managedUnitId || !auth?.token || !auth.activeTuntasId) {
      setUnitMembers([]);
      setTuntasMembers([]);
      setIsLoadingUnitMembers(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingUnitMembers(true);
    setUnitMemberError(null);

    Promise.all([
      api.listOrganizationalUnitMembers(auth.token, auth.activeTuntasId, managedUnitId),
      api.listMembers(auth.token, auth.activeTuntasId).catch(() => ({ members: [], total: 0 }))
    ])
      .then(([memberResponse, tuntasMemberResponse]) => {
        if (isCancelled) return;
        setUnitMembers(memberResponse.members);
        setTuntasMembers(tuntasMemberResponse.members);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setUnitMemberError(cause instanceof Error ? cause.message : "Vieneto narių įkelti nepavyko.");
          setUnitMembers([]);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingUnitMembers(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, managedUnitId, unitMembersReloadKey]);

  const sortedUnits = useMemo(
    () => [...units].sort((left, right) => unitTypeSortOrder(left) - unitTypeSortOrder(right) || unitDisplayTypeLabel(left).localeCompare(unitDisplayTypeLabel(right), "lt") || left.name.localeCompare(right.name, "lt")),
    [units]
  );

  const availableTuntasMembers = useMemo(() => {
    const assignedUserIds = new Set(unitMembers.map((membership) => membership.userId));
    return tuntasMembers
      .filter((member) => !assignedUserIds.has(member.userId) && !member.isIdentityHidden)
      .sort((left, right) => `${left.name} ${left.surname}`.localeCompare(`${right.name} ${right.surname}`, "lt"));
  }, [tuntasMembers, unitMembers]);

  function canManageMembersForUnit(unit: OrganizationalUnit) {
    return canManageAllUnitMembers || (
      canManageOwnUnitMembers && (auth?.leadershipUnitIds.includes(unit.id) ?? false)
    );
  }

  const rankRoles = useMemo(
    () => roles.filter((role) => role.roleType === "RANK").sort((left, right) => roleLabel(left.name).localeCompare(roleLabel(right.name), "lt")),
    [roles]
  );

  const inviteRoleOptions = useMemo(
    () => [...invitationRoleOptions]
      .sort((left, right) => roleLabel(left.role.name).localeCompare(roleLabel(right.role.name), "lt")),
    [invitationRoleOptions]
  );

  const totalMembers = sortedUnits.reduce((sum, unit) => sum + safeCount(unit.memberCount), 0);
  const totalItems = sortedUnits.reduce((sum, unit) => sum + safeCount(unit.itemCount), 0);

  function openCreateUnitPanel() {
    setEditingId(null);
    setUnitForm(emptyUnitForm);
    setMessage(null);
    setError(null);
    setIsUnitPanelOpen(true);
  }

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
    setIsUnitPanelOpen(true);
  }

  function resetUnitForm() {
    setEditingId(null);
    setUnitForm(emptyUnitForm);
  }

  function closeUnitPanel() {
    if (isSavingUnit) return;
    setIsUnitPanelOpen(false);
    resetUnitForm();
  }

  function openInvitePanel() {
    setInviteForm(emptyInviteForm);
    setLatestInvite(null);
    setMessage(null);
    setError(null);
    setIsInvitePanelOpen(true);
  }

  function closeInvitePanel() {
    if (isCreatingInvite) return;
    setIsInvitePanelOpen(false);
    if (searchParams.get("panel") === "invite") {
      const next = new URLSearchParams(searchParams);
      next.delete("panel");
      setSearchParams(next, { replace: true });
    }
  }

  function openUnitMembersPanel(unit: OrganizationalUnit) {
    if (!canManageMembersForUnit(unit)) return;
    setManagedUnit(unit);
    setSelectedMemberId("");
    setSelectedAssignmentType("MEMBER");
    setUnitMemberMessage(null);
    setUnitMemberError(null);
  }

  function closeUnitMembersPanel() {
    if (unitMemberBusy) return;
    setManagedUnit(null);
    setMemberToRemove(null);
  }

  async function assignUnitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managedUnit || !selectedMemberId || !auth?.token || !auth.activeTuntasId || !canManageMembersForUnit(managedUnit)) return;
    setUnitMemberBusy("assign");
    setUnitMemberMessage(null);
    setUnitMemberError(null);
    try {
      await api.addOrganizationalUnitMember(auth.token, auth.activeTuntasId, managedUnit.id, {
        userId: selectedMemberId,
        assignmentType: selectedAssignmentType
      });
      setSelectedMemberId("");
      setUnitMemberMessage("Narys priskirtas vienetui.");
      setUnitMembersReloadKey((value) => value + 1);
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setUnitMemberError(cause instanceof Error ? cause.message : "Nario priskirti nepavyko.");
    } finally {
      setUnitMemberBusy(null);
    }
  }

  async function removeUnitMember() {
    const membership = memberToRemove;
    if (!managedUnit || !membership || !auth?.token || !auth.activeTuntasId || !canManageMembersForUnit(managedUnit)) return;
    setUnitMemberBusy(`remove-${membership.userId}`);
    setUnitMemberMessage(null);
    setUnitMemberError(null);
    try {
      await api.removeOrganizationalUnitMember(auth.token, auth.activeTuntasId, managedUnit.id, membership.userId);
      setMemberToRemove(null);
      setUnitMemberMessage("Narys pašalintas iš vieneto.");
      setUnitMembersReloadKey((value) => value + 1);
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setUnitMemberError(cause instanceof Error ? cause.message : "Nario pašalinti nepavyko.");
    } finally {
      setUnitMemberBusy(null);
    }
  }

  async function updateMemberVisibility(membership: UnitMembership, isPubliclyVisible: boolean) {
    if (!managedUnit || !auth?.token || !auth.activeTuntasId) return;
    setUnitMemberBusy(`visibility-${membership.userId}`);
    setUnitMemberMessage(null);
    setUnitMemberError(null);
    try {
      const updated = await api.updateOrganizationalUnitMemberVisibility(
        auth.token,
        auth.activeTuntasId,
        managedUnit.id,
        membership.userId,
        { isPubliclyVisible }
      );
      setUnitMembers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setUnitMemberMessage("Kandidato matomumas atnaujintas.");
    } catch (cause) {
      setUnitMemberError(cause instanceof Error ? cause.message : "Matomumo atnaujinti nepavyko.");
    } finally {
      setUnitMemberBusy(null);
    }
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
      const safeSaved = normalizeUnitCounts(saved);
      setUnits((current) => editingId
        ? current.map((unit) => unit.id === safeSaved.id ? safeSaved : unit)
        : [...current, safeSaved]);
      setIsUnitPanelOpen(false);
      resetUnitForm();
      setMessage(editingId ? "Vienetas atnaujintas." : "Vienetas sukurtas.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Vieneto išsaugoti nepavyko.");
    } finally {
      setIsSavingUnit(false);
    }
  }

  async function deleteUnit() {
    const unit = unitToDelete;
    if (!unit) return;
    if (!auth?.token || !auth.activeTuntasId || !canManageUnits) return;
    setBusyId(unit.id);
    setMessage(null);
    setError(null);
    try {
      await api.deleteOrganizationalUnit(auth.token, auth.activeTuntasId, unit.id);
      setUnits((current) => current.filter((item) => item.id !== unit.id));
      if (editingId === unit.id) {
        setIsUnitPanelOpen(false);
        resetUnitForm();
      }
      setUnitToDelete(null);
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
    const selectedOption = inviteRoleOptions.find((option) => option.role.id === inviteForm.roleId);
    if (!selectedOption) {
      setError("Pasirinkta rolÄ— nebepasiekiama.");
      return;
    }
    if (!selectedOption.canInviteWithoutOrganizationalUnit && !inviteForm.organizationalUnitId) {
      setError("Pasirinkite vienetÄ….");
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
    <>
      <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={!canFetch || isLoading}>
        <RefreshCw size={17} aria-hidden="true" />
        Atnaujinti
      </button>
      {canCreateInvites && (
        <button className="secondary-button" type="button" onClick={openInvitePanel}>
          <ClipboardCopy size={17} aria-hidden="true" />
          Pakvietimo kodas
        </button>
      )}
      {canManageUnits && (
        <button className="primary-button compact-primary-button" type="button" onClick={openCreateUnitPanel}>
          <Plus size={17} aria-hidden="true" />
          Naujas vienetas
        </button>
      )}
    </>
  );

  return (
    <SkautaiPageShell
      className="units-page"
      eyebrow="Organizacija"
      title="Vienetai"
      description="Peržiūrėkite tunto vienetus, jų narių ir inventoriaus suvestines bei valdykite prisijungimo kodus."
      actions={actions}
      width="wide"
    >
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

          <section className="data-panel units-table-panel">
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
                <UnitsTable
                  units={sortedUnits}
                  canManageUnits={canManageUnits}
                  canManageMembersForUnit={canManageMembersForUnit}
                  busyId={busyId}
                  onEdit={startEdit}
                  onDelete={setUnitToDelete}
                  onManageMembers={openUnitMembersPanel}
                />
              )}
          </section>
        </>
      )}

      <SkautaiPanel
        open={isUnitPanelOpen}
        title={editingId ? "Redaguoti vienetą" : "Naujas vienetas"}
        description="Nurodyk vieneto tipą ir, jei taikoma, priimamą patyrimo laipsnį."
        onClose={closeUnitPanel}
      >
        <UnitFormCard
          canManageUnits={canManageUnits}
          editingId={editingId}
          isSaving={isSavingUnit}
          rankRoles={rankRoles}
          unitForm={unitForm}
          onCancel={closeUnitPanel}
          onSubmit={saveUnit}
          onUnitFormChange={setUnitForm}
        />
      </SkautaiPanel>

      <SkautaiPanel
        open={Boolean(managedUnit)}
        title={managedUnit ? `${managedUnit.name} · nariai` : "Vieneto nariai"}
        description="Priskirkite tunto narius šiam vienetui ir tvarkykite aktyvias narystes pagal savo rolės apimtį."
        variant="workspace"
        onClose={closeUnitMembersPanel}
      >
        {managedUnit && (
          <div className="member-management-panel">
            {unitMemberError && <p className="inline-alert">{unitMemberError}</p>}
            {unitMemberMessage && <p className="inline-success">{unitMemberMessage}</p>}

            <form className="form-panel member-inline-form" onSubmit={assignUnitMember}>
              <div className="form-section-heading">
                <UserPlus aria-hidden="true" />
                <div>
                  <h3>Priskirti narį</h3>
                  <span>Rodomi matomi tunto nariai, kurie dar nėra šiame vienete.</span>
                </div>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Narys *</span>
                  <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} required disabled={Boolean(unitMemberBusy) || availableTuntasMembers.length === 0}>
                    <option value="">{availableTuntasMembers.length === 0 ? "Galimų narių nėra" : "Pasirinkite narį"}</option>
                    {availableTuntasMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>{member.name} {member.surname}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Priskyrimo tipas</span>
                  <select value={selectedAssignmentType} onChange={(event) => setSelectedAssignmentType(event.target.value as "MEMBER" | "VADOVO_PADEJEJAS")} disabled={Boolean(unitMemberBusy)}>
                    <option value="MEMBER">Narys</option>
                    <option value="VADOVO_PADEJEJAS">Vadovo padėjėjas</option>
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button className="primary-button compact-primary-button" type="submit" disabled={Boolean(unitMemberBusy) || !selectedMemberId}>
                  {unitMemberBusy === "assign" ? <Loader2 size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                  Priskirti
                </button>
              </div>
            </form>

            <section className="member-detail-section">
              <h3>Aktyvios narystės</h3>
              {isLoadingUnitMembers ? (
                <p>Kraunami vieneto nariai…</p>
              ) : unitMembers.length === 0 ? (
                <p>Šiame vienete aktyvių narių nėra.</p>
              ) : (
                <div className="workspace-card-grid">
                  {unitMembers.map((membership) => {
                    const canChangeVisibility = membership.canManageVisibility;
                    return (
                      <article className="workspace-summary-card" key={membership.id}>
                        <span className="record-icon"><UsersRound size={17} aria-hidden="true" /></span>
                        <div>
                          <strong>{membership.isIdentityHidden ? "Tapatybė neviešinama" : `${membership.userName} ${membership.userSurname}`.trim()}</strong>
                          <span>{assignmentTypeLabel(membership.assignmentType)}</span>
                          <small>Nuo {formatUnitDate(membership.joinedAt)}</small>
                        </div>
                        <div className="workspace-card-actions">
                          {canChangeVisibility && (
                            <label className="toggle-field">
                              <input
                                type="checkbox"
                                checked={membership.isPubliclyVisible}
                                disabled={Boolean(unitMemberBusy)}
                                onChange={(event) => void updateMemberVisibility(membership, event.target.checked)}
                              />
                              Viešai matomas
                            </label>
                          )}
                          <button className="icon-button danger-icon-button" type="button" title="Pašalinti iš vieneto" disabled={Boolean(unitMemberBusy)} onClick={() => setMemberToRemove(membership)}>
                            <UserMinus size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </SkautaiPanel>

      <SkautaiPanel
        open={isInvitePanelOpen}
        title="Pakvietimo kodas"
        description="Sukurk riboto galiojimo kodą nariui arba vadovui prisijungti."
        variant="modal"
        onClose={closeInvitePanel}
      >
        <InviteFormCard
          canCreateInvites={canCreateInvites}
          inviteForm={inviteForm}
          inviteRoleOptions={inviteRoleOptions}
          isCreatingInvite={isCreatingInvite}
          latestInvite={latestInvite}
          onInviteFormChange={setInviteForm}
          onSubmit={createInvite}
        />
      </SkautaiPanel>

      <SkautaiConfirmDialog
        open={Boolean(unitToDelete)}
        title="Ištrinti vienetą?"
        description={unitToDelete ? `Vienetas „${unitToDelete.name}“ bus pašalintas. Vieneto su nariais ar inventoriumi ištrinti negalima.` : undefined}
        confirmLabel="Ištrinti"
        isBusy={Boolean(unitToDelete && busyId === unitToDelete.id)}
        onConfirm={() => void deleteUnit()}
        onCancel={() => {
          if (!busyId) setUnitToDelete(null);
        }}
      />

      <SkautaiConfirmDialog
        open={Boolean(memberToRemove)}
        title="Pašalinti narį iš vieneto?"
        description={memberToRemove ? `${memberToRemove.userName} ${memberToRemove.userSurname} nebeturės aktyvios narystės vienete „${managedUnit?.name ?? ""}“.` : undefined}
        confirmLabel="Pašalinti"
        isBusy={Boolean(memberToRemove && unitMemberBusy === `remove-${memberToRemove.userId}`)}
        onConfirm={() => void removeUnitMember()}
        onCancel={() => {
          if (!unitMemberBusy) setMemberToRemove(null);
        }}
      />
    </SkautaiPageShell>
  );
}

function UnitsTable({
  units,
  canManageUnits,
  canManageMembersForUnit,
  busyId,
  onEdit,
  onDelete,
  onManageMembers
}: {
  units: OrganizationalUnit[];
  canManageUnits: boolean;
  canManageMembersForUnit: (unit: OrganizationalUnit) => boolean;
  busyId: string | null;
  onEdit: (unit: OrganizationalUnit) => void;
  onDelete: (unit: OrganizationalUnit) => void;
  onManageMembers: (unit: OrganizationalUnit) => void;
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
          <strong>{safeCount(unit.memberCount)}</strong>
          <span>{countLabel(safeCount(unit.memberCount), "narys", "nariai", "narių")}</span>
        </>
      )
    },
    {
      key: "items",
      header: "Inventorius",
      cell: (unit) => (
        <>
          <strong>{safeCount(unit.itemCount)}</strong>
          <span>{countLabel(safeCount(unit.itemCount), "įrašas", "įrašai", "įrašų")}</span>
        </>
      )
    },
    {
      key: "actions",
      header: "",
      className: "table-actions-cell",
      cell: (unit) => (canManageUnits || canManageMembersForUnit(unit)) ? (
        <div className="row-actions">
          {canManageMembersForUnit(unit) && (
            <button className="icon-button" type="button" title="Valdyti narius" aria-label={`Valdyti vieneto ${unit.name} narius`} onClick={() => onManageMembers(unit)}>
              <UsersRound size={17} aria-hidden="true" />
            </button>
          )}
          {canManageUnits && (
            <>
              <button className="icon-button" type="button" title="Redaguoti" onClick={() => onEdit(unit)}>
                <Edit3 size={17} aria-hidden="true" />
              </button>
              <button className="icon-button danger-icon-button" type="button" title="Ištrinti" disabled={busyId === unit.id} onClick={() => onDelete(unit)}>
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </>
          )}
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
    <form className="form-panel unit-editor-form" onSubmit={onSubmit}>
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
  inviteRoleOptions,
  isCreatingInvite,
  latestInvite,
  onInviteFormChange,
  onSubmit
}: {
  canCreateInvites: boolean;
  inviteForm: InviteForm;
  inviteRoleOptions: InvitationRoleOption[];
  isCreatingInvite: boolean;
  latestInvite: InvitationResponse | null;
  onInviteFormChange: (value: InviteForm | ((current: InviteForm) => InviteForm)) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const selectedOption = inviteRoleOptions.find((option) => option.role.id === inviteForm.roleId);
  const units = selectedOption?.organizationalUnits ?? [];
  const requiresUnit = selectedOption?.canInviteWithoutOrganizationalUnit === false;

  function handleInviteRoleChange(roleId: string) {
    const option = inviteRoleOptions.find((candidate) => candidate.role.id === roleId);
    const organizationalUnitId = option && !option.canInviteWithoutOrganizationalUnit && option.organizationalUnits.length === 1
      ? option.organizationalUnits[0].id
      : "";
    onInviteFormChange((current) => ({ ...current, roleId, organizationalUnitId }));
  }

  return (
    <form className="form-panel unit-invite-form" onSubmit={onSubmit}>
      <fieldset disabled={!canCreateInvites || isCreatingInvite}>
        <div className="form-grid one-column-grid">
          <label className="form-field">
            <span>Rolė *</span>
            <select value={inviteForm.roleId} onChange={(event) => handleInviteRoleChange(event.target.value)} required>
              <option value="">Pasirinkite rolę</option>
              {inviteRoleOptions.map(({ role }) => (
                <option key={role.id} value={role.id}>{roleLabel(role.name)} ({role.roleType === "RANK" ? "laipsnis" : "pareigos"})</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Vienetas</span>
            <select
              value={inviteForm.organizationalUnitId}
              onChange={(event) => onInviteFormChange((current) => ({ ...current, organizationalUnitId: event.target.value }))}
              disabled={!selectedOption}
              required={requiresUnit}
            >
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

function normalizeUnitCounts(unit: OrganizationalUnit): OrganizationalUnit {
  return {
    ...unit,
    memberCount: safeCount(unit.memberCount),
    itemCount: safeCount(unit.itemCount)
  };
}

function formatUnitDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date);
}

function safeCount(value: unknown) {
  if (value == null || value === "") return 0;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.trunc(numeric);
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
