import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, Edit3, History, Mail, Network, PackageSearch, Phone, Plus, ShieldCheck, Trash2, UserMinus, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Member, MemberLeadershipRole, OrganizationalUnit, Role } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiPanel, SkautaiTabs } from "../components/ui/Skautai";
import { assignmentTypeLabel, roleLabel, statusLabel } from "../utils/display";
import { hasPermission } from "../utils/permissions";
import { unitPaletteClass } from "../utils/unitPalette";

type PanelTab = "profile" | "leadership" | "units";
type ActivitySummary = { reservations: number; requests: number };

const inactiveReservationStatuses = new Set(["REJECTED", "CANCELLED", "RETURNED", "COMPLETED"]);
const inactiveRequestStatuses = new Set(["REJECTED", "CANCELLED", "FULFILLED", "COMPLETED"]);
const inactiveUnitRequestStatuses = new Set(["REJECTED", "CANCELLED"]);

export function MemberManagementPanel({
  member,
  onClose,
  onMemberUpdated,
  onMemberRemoved
}: {
  member: Member | null;
  onClose: () => void;
  onMemberUpdated: (member: Member) => void;
  onMemberRemoved: (userId: string) => void;
}) {
  const { auth } = useAuth();
  const [detail, setDetail] = useState<Member | null>(member);
  const [roles, setRoles] = useState<Role[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [directoryMembers, setDirectoryMembers] = useState<Member[]>([]);
  const [activity, setActivity] = useState<ActivitySummary>({ reservations: 0, requests: 0 });
  const [tab, setTab] = useState<PanelTab>("profile");
  const [leadershipRoleId, setLeadershipRoleId] = useState("");
  const [leadershipUnitId, setLeadershipUnitId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [rankRoleId, setRankRoleId] = useState("");
  const [addUnitId, setAddUnitId] = useState("");
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [resignationReason, setResignationReason] = useState("");
  const [successorUserId, setSuccessorUserId] = useState("");
  const [editingRole, setEditingRole] = useState<MemberLeadershipRole | null>(null);
  const [editUnitId, setEditUnitId] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const onMemberUpdatedRef = useRef(onMemberUpdated);
  const memberId = member?.userId ?? null;

  useEffect(() => {
    onMemberUpdatedRef.current = onMemberUpdated;
  }, [onMemberUpdated]);

  const permissions = auth?.permissions;
  const canManageRoles = hasPermission(permissions, "roles.assign");
  const canManageAllUnitMembers = permissions?.includes("unit.members.manage") === true || permissions?.includes("unit.members.manage:ALL") === true;
  const canManageOwnUnitMembers = permissions?.includes("unit.members.manage:OWN_UNIT") === true;
  const canManageUnits = canManageAllUnitMembers || canManageOwnUnitMembers;
  const canRemoveMembers = hasPermission(permissions, "members.remove");
  const canViewInventory = hasPermission(permissions, "items.view");
  const isSelf = detail?.userId === auth?.userId;

  const canManageUnit = useCallback((unitId: string) => (
    canManageAllUnitMembers || (canManageOwnUnitMembers && (auth?.leadershipUnitIds.includes(unitId) ?? false))
  ), [auth?.leadershipUnitIds, canManageAllUnitMembers, canManageOwnUnitMembers]);

  const refresh = useCallback(async () => {
    if (!memberId || !auth?.token || !auth.activeTuntasId) return;
    const [memberResponse, roleResponse, unitResponse, memberList, reservations, requisitions, sharedRequests] = await Promise.all([
      api.getMember(auth.token, auth.activeTuntasId, memberId),
      api.listRoles(auth.token, auth.activeTuntasId).catch(() => ({ roles: [], total: 0 })),
      api.listOrganizationalUnits(auth.token, auth.activeTuntasId).catch(() => ({ units: [], total: 0 })),
      api.listMembers(auth.token, auth.activeTuntasId).catch(() => ({ members: [], total: 0 })),
      api.listReservations(auth.token, auth.activeTuntasId).catch(() => null),
      api.listRequisitions(auth.token, auth.activeTuntasId).catch(() => null),
      api.listSharedInventoryRequests(auth.token, auth.activeTuntasId).catch(() => null)
    ]);

    setDetail(memberResponse);
    setRoles(roleResponse.roles);
    setUnits(unitResponse.units);
    setDirectoryMembers(memberList.members);
    setActivity({
      reservations: reservations?.reservations.filter((reservation) => reservation.reservedByUserId === memberId && !inactiveReservationStatuses.has(reservation.status)).length ?? 0,
      requests: (requisitions?.requests.filter((request) => request.createdByUserId === memberId && !inactiveRequestStatuses.has(request.status)).length ?? 0) +
        (sharedRequests?.requests.filter((request) => request.requestedByUserId === memberId && !inactiveRequestStatuses.has(request.topLevelStatus) && !inactiveUnitRequestStatuses.has(request.draugininkasStatus ?? "")).length ?? 0)
    });
    onMemberUpdatedRef.current(memberResponse);
  }, [auth?.activeTuntasId, auth?.token, memberId]);

  useEffect(() => {
    setDetail(member);
    setTab("profile");
    setError(null);
    setMessage(null);
    setEditingRole(null);
    if (memberId) refresh().catch((cause) => setError(messageOf(cause, "Nario informacijos įkelti nepavyko.")));
  }, [memberId, refresh]);

  async function execute(action: string, success: string, operation: () => Promise<unknown>, refreshAfter = true): Promise<boolean> {
    if (busy) return false;
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      await operation();
      if (refreshAfter) await refresh();
      setMessage(success);
      return true;
    } catch (cause) {
      setError(messageOf(cause, "Veiksmo atlikti nepavyko."));
      return false;
    } finally {
      setBusy(null);
    }
  }

  function assignLeadership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !auth?.token || !auth.activeTuntasId || !leadershipRoleId) return;
    if (roleRequiresUnit && !leadershipUnitId) {
      setError("Šiai vadovavimo rolei būtina pasirinkti vienetą.");
      return;
    }
    if (!roleRequiresUnit && leadershipUnitId) {
      setError("Tunto lygmens rolė negali būti priskirta vienetui.");
      return;
    }
    void execute("leadership", "Vadovavimo rolė priskirta.", () => api.assignLeadershipRole(auth.token, auth.activeTuntasId!, detail.userId, {
      roleId: leadershipRoleId,
      organizationalUnitId: optional(leadershipUnitId),
      startsAt: toInstant(startsAt),
      expiresAt: toInstant(expiresAt)
    })).then((succeeded) => {
      if (!succeeded) return;
      setLeadershipRoleId("");
      setLeadershipUnitId("");
      setStartsAt("");
      setExpiresAt("");
    });
  }

  function beginEditRole(assignment: MemberLeadershipRole) {
    setEditingRole(assignment);
    setEditUnitId(assignment.organizationalUnitId ?? "");
    setEditStartsAt(toLocalDateTime(assignment.startsAt));
    setEditExpiresAt(toLocalDateTime(assignment.expiresAt));
    setEditStatus(assignment.termStatus);
  }

  function updateLeadership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !editingRole || !auth?.token || !auth.activeTuntasId) return;
    void execute(`edit-${editingRole.id}`, "Vadovavimo rolė atnaujinta.", () => api.updateLeadershipRole(
      auth.token,
      auth.activeTuntasId!,
      detail.userId,
      editingRole.id,
      {
        startsAt: toInstant(editStartsAt),
        expiresAt: toInstant(editExpiresAt),
        termStatus: editStatus,
        organizationalUnitId: optional(editUnitId),
        clearStartsAt: !editStartsAt && Boolean(editingRole.startsAt),
        clearExpiresAt: !editExpiresAt && Boolean(editingRole.expiresAt),
        clearOrganizationalUnitId: !editUnitId && Boolean(editingRole.organizationalUnitId)
      }
    )).then((succeeded) => { if (succeeded) setEditingRole(null); });
  }

  function removeLeadership(assignmentId: string) {
    if (!detail || !auth?.token || !auth.activeTuntasId || !window.confirm("Pašalinti šią vadovavimo rolę?")) return;
    void execute(assignmentId, "Vadovavimo rolė užbaigta.", () => api.deleteLeadershipRole(auth.token, auth.activeTuntasId!, detail.userId, assignmentId));
  }

  function stepDown(assignmentId: string) {
    if (!auth?.token || !auth.activeTuntasId || !window.confirm("Atsistatydinti iš šių pareigų?")) return;
    void execute(assignmentId, "Iš vadovavimo rolės atsistatydinta.", () => api.stepDownLeadershipRole(auth.token, auth.activeTuntasId!, assignmentId));
  }

  function requestResignation(assignmentId: string) {
    if (!auth?.token || !auth.activeTuntasId) return;
    void execute(`resign-${assignmentId}`, "Atsistatydinimo prašymas pateiktas.", () => api.requestLeadershipResignation(auth.token, auth.activeTuntasId!, assignmentId, { reason: optional(resignationReason) }), false);
  }

  function transferTuntininkas() {
    if (!auth?.token || !auth.activeTuntasId || !successorUserId || !window.confirm("Perleisti tuntininko pareigas pasirinktam nariui?")) return;
    void execute("transfer-tuntininkas", "Tuntininko pareigos perleistos.", () => api.transferTuntininkas(auth.token, auth.activeTuntasId!, { successorUserId })).then((succeeded) => { if (succeeded) setSuccessorUserId(""); });
  }

  function assignRank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !auth?.token || !auth.activeTuntasId || !rankRoleId) return;
    void execute("rank", "Patyrimo laipsnis priskirtas.", () => api.assignRank(auth.token, auth.activeTuntasId!, detail.userId, { roleId: rankRoleId })).then((succeeded) => { if (succeeded) setRankRoleId(""); });
  }

  function removeRank(rankId: string) {
    if (!detail || !auth?.token || !auth.activeTuntasId || !window.confirm("Pašalinti šį patyrimo laipsnį?")) return;
    void execute(rankId, "Patyrimo laipsnis pašalintas.", () => api.deleteRank(auth.token, auth.activeTuntasId!, detail.userId, rankId));
  }

  function addToUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !auth?.token || !auth.activeTuntasId || !addUnitId || !canManageUnit(addUnitId)) return;
    void execute("add-unit", "Narys pridėtas į vienetą.", () => api.addOrganizationalUnitMember(auth.token, auth.activeTuntasId!, addUnitId, { userId: detail.userId, assignmentType: "MEMBER" })).then((succeeded) => { if (succeeded) setAddUnitId(""); });
  }

  function moveMember(fromUnitId: string) {
    const target = moveTargets[fromUnitId];
    if (!detail || !auth?.token || !auth.activeTuntasId || !target || !canManageUnit(fromUnitId) || !canManageUnit(target)) return;
    void execute(`move-${fromUnitId}`, "Narys perkeltas į tos pačios rūšies vienetą.", () => api.moveOrganizationalUnitMember(auth.token, auth.activeTuntasId!, target, detail.userId));
  }

  function toggleVisibility(unitId: string, visible: boolean) {
    if (!detail || !auth?.token || !auth.activeTuntasId || !canManageUnit(unitId)) return;
    void execute(`visibility-${unitId}`, "Nario matomumas atnaujintas.", () => api.updateOrganizationalUnitMemberVisibility(auth.token, auth.activeTuntasId!, unitId, detail.userId, { isPubliclyVisible: visible }));
  }

  function removeFromUnit(unitId: string) {
    if (!detail || !auth?.token || !auth.activeTuntasId || !canManageUnit(unitId) || !window.confirm("Pašalinti narį iš šio vieneto?")) return;
    void execute(`remove-unit-${unitId}`, "Narys pašalintas iš vieneto.", () => api.removeOrganizationalUnitMember(auth.token, auth.activeTuntasId!, unitId, detail.userId));
  }

  function removeMember() {
    if (!detail || !auth?.token || !auth.activeTuntasId || !window.confirm("Pašalinti narį iš tunto? Šis veiksmas nutrauks aktyvias jo roles ir narystes.")) return;
    setBusy("remove-member");
    api.removeMember(auth.token, auth.activeTuntasId, detail.userId)
      .then(() => { onMemberRemoved(detail.userId); onClose(); })
      .catch((cause) => { setError(messageOf(cause, "Nario pašalinti nepavyko.")); setBusy(null); });
  }

  const leadershipRoles = useMemo(() => roles.filter((role) => role.roleType === "LEADERSHIP" && !isTuntininkasRole(role.name)), [roles]);
  const selectedLeadershipRole = leadershipRoles.find((role) => role.id === leadershipRoleId);
  const roleRequiresUnit = selectedLeadershipRole?.requiresOrganizationalUnit ?? false;
  const eligibleLeadershipUnits = eligibleUnitsForRole(selectedLeadershipRole, units);
  const rankRoles = useMemo(() => roles.filter((role) => role.roleType === "RANK"), [roles]);
  const manageableUnits = units.filter((unit) => canManageUnit(unit.id));
  const availableUnits = manageableUnits.filter((unit) => !(detail?.unitAssignments ?? []).some((assignment) => assignment.organizationalUnitId === unit.id));
  const successorCandidates = directoryMembers.filter((candidate) => candidate.userId !== detail?.userId && !candidate.isIdentityHidden);
  const hasActiveTuntininkasRole = isSelf && (detail?.leadershipRoles ?? []).some((assignment) => assignment.termStatus === "ACTIVE" && isTuntininkasRole(assignment.roleName));

  return (
    <SkautaiPanel open={Boolean(member)} title={detail ? memberName(detail) : "Narys"} description={detail ? primaryRole(detail) : undefined} variant="workspace" onClose={onClose}>
      {detail && <div className="member-management-panel">
        {error && <p className="inline-alert">{error}</p>}
        {message && <p className="inline-success">{message}</p>}
        <SkautaiTabs
          className="member-management-tabs"
          label="Nario valdymo skyriai"
          activeTab={tab}
          onChange={(value) => setTab(value as PanelTab)}
          tabs={[
            { id: "profile", label: "Profilis" },
            { id: "leadership", label: "Rolės ir laipsniai" },
            { id: "units", label: "Vienetai" }
          ]}
        />

        {tab === "profile" && <div className="member-detail-content">
          <section className="member-profile-hero">
            <span className="member-avatar member-profile-avatar">{initials(detail)}</span>
            <div><h3>{memberName(detail)}</h3><p>{primaryRole(detail)}</p></div>
            <div className="member-contact-actions">
              <a className="secondary-button" href={`mailto:${detail.email}`}><Mail size={16} />Rašyti</a>
              {detail.phone?.trim() && <a className="secondary-button" href={`tel:${detail.phone.trim()}`}><Phone size={16} />Skambinti</a>}
            </div>
          </section>
          <section className="member-activity-grid" aria-label="Nario veiklos suvestinė">
            <div><span>Aktyvios rezervacijos</span><strong>{activity.reservations}</strong></div>
            <div><span>Aktyvūs prašymai</span><strong>{activity.requests}</strong></div>
            <div><span>Vadovavimo rolės</span><strong>{(detail.leadershipRoles ?? []).length}</strong></div>
          </section>
          <section className="member-detail-section"><h3>Kontaktai</h3><dl className="member-detail-list">
            <div><dt>El. paštas</dt><dd>{detail.email}</dd></div>
            <div><dt>Telefonas</dt><dd>{detail.phone?.trim() || "–"}</dd></div>
            <div><dt>Įstojo</dt><dd>{formatDate(detail.joinedAt)}</dd></div>
            <div><dt>Matomumas</dt><dd>{detail.isIdentityHidden ? "Tapatybė ribojama" : "Įprastas"}</dd></div>
          </dl></section>
          <section className="member-detail-section"><h3>Organizacijos suvestinė</h3><dl className="member-detail-list">
            <div><dt>Laipsniai</dt><dd>{(detail.ranks ?? []).map((rank) => roleLabel(rank.roleName)).join(", ") || "–"}</dd></div>
            <div><dt>Vienetai</dt><dd>{(detail.unitAssignments ?? []).map((assignment) => assignment.organizationalUnitName).join(", ") || "–"}</dd></div>
          </dl></section>
          {canViewInventory && <Link className="member-inventory-link" to={`/inventory?responsibleUserId=${encodeURIComponent(detail.userId)}`}><PackageSearch size={18} /><span><strong>Nariui priskirtas inventorius</strong><small>Atidaryti inventoriaus sąrašą su nario filtru</small></span></Link>}
          {canRemoveMembers && !isSelf && <section className="member-danger-zone"><div><h3>Pašalinti iš tunto</h3><p>Naudokite tik kai narystė iš tikrųjų baigiama.</p></div><button className="primary-button tone-danger" type="button" disabled={Boolean(busy)} onClick={removeMember}><UserMinus size={17} />Pašalinti narį</button></section>}
        </div>}

        {tab === "leadership" && <div className="member-detail-content">
          {canManageRoles && <div className="member-form-grid">
            <form className="form-panel member-inline-form" onSubmit={assignLeadership}>
              <div className="form-section-heading"><ShieldCheck /><div><h3>Priskirti vadovavimo rolę</h3><span>Rodomos tik serverio sukonfigūruotos rolės ir joms tinkami vienetai.</span></div></div>
              <div className="form-grid">
                <label className="form-field"><span>Rolė *</span><select value={leadershipRoleId} onChange={(event) => { setLeadershipRoleId(event.target.value); setLeadershipUnitId(""); }} required><option value="">Pasirinkite</option>{leadershipRoles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>)}</select></label>
                <label className="form-field"><span>Vienetas{roleRequiresUnit ? " *" : ""}</span><select value={leadershipUnitId} onChange={(event) => setLeadershipUnitId(event.target.value)} required={roleRequiresUnit} disabled={Boolean(selectedLeadershipRole && !roleRequiresUnit)}><option value="">Tunto lygmuo</option>{eligibleLeadershipUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
                <label className="form-field"><span>Pradžia</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
                <label className="form-field"><span>Pabaiga</span><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
              </div>
              <div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}><Plus size={16} />Priskirti</button></div>
            </form>
            <form className="form-panel member-inline-form" onSubmit={assignRank}>
              <div className="form-section-heading"><Award /><div><h3>Priskirti patyrimo laipsnį</h3><span>Vienas galiojantis patyrimo laipsnis pakeičia ankstesnį.</span></div></div>
              <label className="form-field"><span>Laipsnis *</span><select value={rankRoleId} onChange={(event) => setRankRoleId(event.target.value)} required><option value="">Pasirinkite</option>{rankRoles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>)}</select></label>
              <div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}>Priskirti</button></div>
            </form>
          </div>}

          {editingRole && <form className="form-panel member-inline-form member-edit-role-form" onSubmit={updateLeadership}>
            <div className="form-section-heading"><Edit3 /><div><h3>Redaguoti {roleLabel(editingRole.roleName)}</h3><span>Keiskite kadencijos laiką, būseną arba organizacinį vienetą.</span></div></div>
            <div className="form-grid">
              <label className="form-field"><span>Būsena</span><select value={editStatus} onChange={(event) => setEditStatus(event.target.value)}><option value="ACTIVE">Aktyvi</option><option value="COMPLETED">Baigta</option><option value="RESIGNED">Atsistatydinta</option></select></label>
              <label className="form-field"><span>Vienetas</span><select value={editUnitId} onChange={(event) => setEditUnitId(event.target.value)}><option value="">Tunto lygmuo</option>{eligibleUnitsForRole(roles.find((role) => role.id === editingRole.roleId), units).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
              <label className="form-field"><span>Pradžia</span><input type="datetime-local" value={editStartsAt} onChange={(event) => setEditStartsAt(event.target.value)} /></label>
              <label className="form-field"><span>Pabaiga</span><input type="datetime-local" value={editExpiresAt} onChange={(event) => setEditExpiresAt(event.target.value)} /></label>
            </div>
            <div className="form-actions"><button className="secondary-button" type="button" onClick={() => setEditingRole(null)}>Atšaukti</button><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}>Išsaugoti</button></div>
          </form>}

          <section className="member-detail-section"><h3>Aktyvios vadovavimo rolės</h3>
            {(detail.leadershipRoles ?? []).length === 0 ? <p>Aktyvių vadovavimo rolių nėra.</p> : <div className="workspace-card-grid">{(detail.leadershipRoles ?? []).map((assignment) => <article className="workspace-record-card" key={assignment.id}>
              <span className="record-icon"><ShieldCheck size={17} /></span>
              <div><strong>{roleLabel(assignment.roleName)}</strong><span>{assignment.organizationalUnitName ?? "Tunto lygmuo"}</span><small>{statusLabel(assignment.termStatus)} · kadencija {assignment.termNumber}{assignment.expiresAt ? ` · iki ${formatDate(assignment.expiresAt)}` : ""}</small></div>
              <div className="row-actions">
                {canManageRoles && <button className="icon-button" type="button" title="Redaguoti rolę" onClick={() => beginEditRole(assignment)}><Edit3 size={16} /></button>}
                {isSelf && assignment.termStatus === "ACTIVE" && !isTuntininkasRole(assignment.roleName) && (isPrincipalUnitLeaderRole(assignment.roleName)
                  ? <button className="secondary-button member-role-action" type="button" onClick={() => requestResignation(assignment.id)}>Prašyti pakeitimo</button>
                  : <button className="icon-button danger-icon-button" type="button" title="Atsistatydinti" onClick={() => stepDown(assignment.id)}><UserMinus size={16} /></button>)}
                {canManageRoles && !isSelf && <button className="icon-button danger-icon-button" type="button" title="Užbaigti rolę" onClick={() => removeLeadership(assignment.id)}><Trash2 size={16} /></button>}
              </div>
            </article>)}</div>}
            {isSelf && (detail.leadershipRoles ?? []).some((assignment) => isPrincipalUnitLeaderRole(assignment.roleName)) && <label className="form-field member-resignation-reason"><span>Atsistatydinimo priežastis (nebūtina)</span><textarea rows={2} value={resignationReason} onChange={(event) => setResignationReason(event.target.value)} /></label>}
          </section>

          {hasActiveTuntininkasRole && <section className="form-panel member-inline-form">
            <div className="form-section-heading"><UsersRound /><div><h3>Perleisti tuntininko pareigas</h3><span>Naujajam tuntininkui bus paliktas Vadovo laipsnis, o jo kitos vadovavimo pareigos bus užbaigtos.</span></div></div>
            <div className="inline-workspace-form"><select value={successorUserId} onChange={(event) => setSuccessorUserId(event.target.value)}><option value="">Pasirinkite naują tuntininką</option>{successorCandidates.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{memberName(candidate)}</option>)}</select><button className="primary-button compact-primary-button" type="button" disabled={!successorUserId || Boolean(busy)} onClick={transferTuntininkas}>Perleisti</button></div>
          </section>}

          <section className="member-detail-section"><h3>Patyrimo laipsniai</h3>{(detail.ranks ?? []).length === 0 ? <p>Laipsnių nėra.</p> : <div className="workspace-card-grid">{(detail.ranks ?? []).map((rank) => <article className="workspace-record-card" key={rank.id}><span className="record-icon"><Award size={17} /></span><div><strong>{roleLabel(rank.roleName)}</strong><span>Priskirta {formatDate(rank.assignedAt)}</span></div>{canManageRoles && <button className="icon-button danger-icon-button" type="button" title="Pašalinti laipsnį" onClick={() => removeRank(rank.id)}><Trash2 size={16} /></button>}</article>)}</div>}</section>

          <section className="member-detail-section"><div className="form-section-heading"><History /><div><h3>Vadovavimo istorija</h3><span>Užbaigtos kadencijos ir atsistatydinimai.</span></div></div>{(detail.leadershipRoleHistory ?? []).length === 0 ? <p>Vadovavimo istorijos nėra.</p> : <div className="member-history-list">{(detail.leadershipRoleHistory ?? []).map((assignment) => <div key={assignment.id}><strong>{roleLabel(assignment.roleName)}</strong><span>{assignment.organizationalUnitName ?? "Tunto lygmuo"}</span><small>{statusLabel(assignment.termStatus)} · {formatDate(assignment.startsAt ?? assignment.assignedAt)}–{formatDate(assignment.leftAt ?? assignment.expiresAt)}</small></div>)}</div>}</section>
        </div>}

        {tab === "units" && <div className="member-detail-content">
          {canManageUnits && availableUnits.length > 0 && <form className="form-panel member-inline-form" onSubmit={addToUnit}><div className="form-section-heading"><Network /><div><h3>Pridėti į vienetą</h3><span>Rodomi tik vienetai, kuriuos leidžia valdyti jūsų rolės apimtis.</span></div></div><div className="inline-workspace-form"><select value={addUnitId} onChange={(event) => setAddUnitId(event.target.value)} required><option value="">Pasirinkite vienetą</option>{availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}><Plus size={16} />Pridėti</button></div></form>}
          <section className="member-detail-section"><h3>Aktyvios vienetų narystės</h3>{(detail.unitAssignments ?? []).length === 0 ? <p>Narys nepriskirtas vienetui.</p> : <div className="workspace-card-grid">{(detail.unitAssignments ?? []).map((assignment) => {
            const sourceUnit = units.find((unit) => unit.id === assignment.organizationalUnitId);
            const moveOptions = sourceUnit ? manageableUnits.filter((unit) => unit.id !== sourceUnit.id && unit.type === sourceUnit.type) : [];
            const palette = sourceUnit ? unitPaletteClass(sourceUnit) : "unit-palette-default";
            return <article className={`workspace-summary-card member-unit-card ${palette}`} key={assignment.id}><span className="record-icon unit-type-icon"><UsersRound size={17} /></span><div><strong>{assignment.organizationalUnitName}</strong><span>{assignmentTypeLabel(assignment.assignmentType)}</span><small>Nuo {formatDate(assignment.joinedAt)} · {assignment.isPubliclyVisible === false ? "tapatybė paslėpta" : "matomas"}</small></div>{canManageUnit(assignment.organizationalUnitId) && <div className="workspace-card-actions"><label className="toggle-field"><input type="checkbox" checked={assignment.isPubliclyVisible !== false} onChange={(event) => toggleVisibility(assignment.organizationalUnitId, event.target.checked)} />Viešas matomumas</label>{moveOptions.length > 0 && <><select value={moveTargets[assignment.organizationalUnitId] ?? ""} onChange={(event) => setMoveTargets((current) => ({ ...current, [assignment.organizationalUnitId]: event.target.value }))}><option value="">Perkelti į tos pačios rūšies vienetą…</option>{moveOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><button className="secondary-button" type="button" disabled={!moveTargets[assignment.organizationalUnitId]} onClick={() => moveMember(assignment.organizationalUnitId)}>Perkelti</button></>}<button className="icon-button danger-icon-button" type="button" title="Pašalinti iš vieneto" onClick={() => removeFromUnit(assignment.organizationalUnitId)}><Trash2 size={16} /></button></div>}</article>;
          })}</div>}</section>
        </div>}
      </div>}
    </SkautaiPanel>
  );
}

function eligibleUnitsForRole(role: Role | undefined, units: OrganizationalUnit[]) {
  const allowedTypes = role?.allowedOrganizationalUnitTypes ?? [];
  return allowedTypes.length === 0 ? units : units.filter((unit) => allowedTypes.includes(unit.type));
}

function isTuntininkasRole(roleName: string) {
  return roleName.trim().toLocaleLowerCase("lt-LT") === "tuntininkas";
}

function isPrincipalUnitLeaderRole(roleName: string) {
  return roleName in principalRoleLookup;
}

const principalRoleLookup: Record<string, true> = {
  Draugininkas: true,
  "Gildijos pirmininkas": true,
  "Vyr. skautu draugoves draugininkas": true,
  "Vyr. skautu burelio pirmininkas": true,
  "Vyr. skauciu draugoves draugininkas": true,
  "Vyr. skauciu burelio pirmininkas": true
};

function memberName(member: Member) { return [member.name, member.surname].filter(Boolean).join(" ") || member.email; }
function initials(member: Member) { return memberName(member).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("lt-LT")).join("") || "?"; }
function primaryRole(member: Member) { return roleLabel(member.leadershipRoles?.[0]?.roleName ?? member.ranks?.[0]?.roleName ?? "eilinis_narys"); }
function optional(value: string) { const trimmed = value.trim(); return trimmed ? trimmed : null; }
function toInstant(value: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function toLocalDateTime(value?: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
function messageOf(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
function formatDate(value?: string | null) { if (!value) return "–"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date); }
