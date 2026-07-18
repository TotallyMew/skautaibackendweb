import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, Network, Plus, ShieldCheck, Trash2, UserMinus, UsersRound } from "lucide-react";
import { api } from "../api/client";
import type { Member, OrganizationalUnit, Role } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiPanel, SkautaiStatusPill } from "../components/ui/Skautai";
import { assignmentTypeLabel, roleLabel } from "../utils/display";
import { hasPermission } from "../utils/permissions";

type PanelTab = "profile" | "leadership" | "units";

const unitScopedLeadershipRoleNames = new Set([
  "Draugininkas", "Draugininko pavaduotojas", "Gildijos pirmininkas", "Gildijos pirmininko pavaduotojas",
  "Vyr. skautu draugoves draugininkas", "Vyr. skautu draugoves draugininko pavaduotojas",
  "Vyr. skautu burelio pirmininkas", "Vyr. skautu burelio pirmininko pavaduotojas",
  "Vyr. skauciu draugoves draugininkas", "Vyr. skauciu draugoves draugininko pavaduotojas",
  "Vyr. skauciu burelio pirmininkas", "Vyr. skauciu burelio pirmininko pavaduotojas"
]);

export function MemberManagementPanel({ member, onClose, onMemberUpdated, onMemberRemoved }: { member: Member | null; onClose: () => void; onMemberUpdated: (member: Member) => void; onMemberRemoved: (userId: string) => void }) {
  const { auth } = useAuth();
  const [detail, setDetail] = useState<Member | null>(member);
  const [roles, setRoles] = useState<Role[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [tab, setTab] = useState<PanelTab>("profile");
  const [leadershipRoleId, setLeadershipRoleId] = useState("");
  const [leadershipUnitId, setLeadershipUnitId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [rankRoleId, setRankRoleId] = useState("");
  const [addUnitId, setAddUnitId] = useState("");
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [resignationReason, setResignationReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const onMemberUpdatedRef = useRef(onMemberUpdated);
  const memberId = member?.userId ?? null;

  useEffect(() => {
    onMemberUpdatedRef.current = onMemberUpdated;
  }, [onMemberUpdated]);

  const canManageMembers = hasPermission(auth?.permissions, "members.manage");
  const canManageUnits = hasPermission(auth?.permissions, "unit.members.manage");
  const canRemoveMembers = hasPermission(auth?.permissions, "members.remove");
  const isSelf = detail?.userId === auth?.userId;

  const refresh = useCallback(async () => {
    if (!memberId || !auth?.token || !auth.activeTuntasId) return;
    const [memberResponse, roleResponse, unitResponse] = await Promise.all([
      api.getMember(auth.token, auth.activeTuntasId, memberId),
      api.listRoles(auth.token, auth.activeTuntasId).catch(() => ({ roles: [], total: 0 })),
      api.listOrganizationalUnits(auth.token, auth.activeTuntasId).catch(() => ({ units: [], total: 0 }))
    ]);
    setDetail(memberResponse); setRoles(roleResponse.roles); setUnits(unitResponse.units); onMemberUpdatedRef.current(memberResponse);
  }, [auth?.activeTuntasId, auth?.token, memberId]);

  useEffect(() => {
    setDetail(member);
    setTab("profile");
    setError(null);
    setMessage(null);
    if (memberId) refresh().catch((cause) => setError(messageOf(cause, "Nario informacijos įkelti nepavyko.")));
    // Parent list refreshes may replace the member object. Only an actual selection
    // change may reset this panel and its active tab.
  }, [memberId, refresh]);

  async function execute(action: string, success: string, operation: () => Promise<unknown>, refreshAfter = true) {
    if (busy) return; setBusy(action); setError(null); setMessage(null);
    try { const result = await operation(); if (isMember(result)) { setDetail(result); onMemberUpdated(result); } else if (refreshAfter) await refresh(); setMessage(success); }
    catch (cause) { setError(messageOf(cause, "Veiksmo atlikti nepavyko.")); }
    finally { setBusy(null); }
  }

  function assignLeadership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !auth?.token || !auth.activeTuntasId || !leadershipRoleId) return;
    if (roleRequiresUnit && !leadershipUnitId) { setError("Šiai vadovavimo rolei būtina pasirinkti vienetą."); return; }
    if (!roleRequiresUnit && leadershipUnitId) { setError("Tunto lygmens rolė negali būti priskirta vienetui."); return; }
    void execute("leadership", "Vadovavimo rolė priskirta.", () => api.assignLeadershipRole(auth.token, auth.activeTuntasId!, detail.userId, { roleId: leadershipRoleId, organizationalUnitId: optional(leadershipUnitId), startsAt: toInstant(startsAt), expiresAt: toInstant(expiresAt) })).then(() => { setLeadershipRoleId(""); setLeadershipUnitId(""); setStartsAt(""); setExpiresAt(""); });
  }
  function removeLeadership(assignmentId: string) { if (!detail || !auth?.token || !auth.activeTuntasId || !window.confirm("Pašalinti šią vadovavimo rolę?")) return; const operation = isSelf ? () => api.stepDownLeadershipRole(auth.token, auth.activeTuntasId!, assignmentId) : () => api.deleteLeadershipRole(auth.token, auth.activeTuntasId!, detail.userId, assignmentId); void execute(assignmentId, "Vadovavimo rolė užbaigta.", operation); }
  function requestResignation(assignmentId: string) { if (!auth?.token || !auth.activeTuntasId) return; void execute(`resign-${assignmentId}`, "Atsistatydinimo prašymas pateiktas.", () => api.requestLeadershipResignation(auth.token, auth.activeTuntasId!, assignmentId, { reason: optional(resignationReason) }), false); }
  function assignRank(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!detail || !auth?.token || !auth.activeTuntasId || !rankRoleId) return; void execute("rank", "Patyrimo laipsnis priskirtas.", () => api.assignRank(auth.token, auth.activeTuntasId!, detail.userId, { roleId: rankRoleId })).then(() => setRankRoleId("")); }
  function removeRank(rankId: string) { if (!detail || !auth?.token || !auth.activeTuntasId || !window.confirm("Pašalinti šį patyrimo laipsnį?")) return; void execute(rankId, "Patyrimo laipsnis pašalintas.", () => api.deleteRank(auth.token, auth.activeTuntasId!, detail.userId, rankId)); }
  function addToUnit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!detail || !auth?.token || !auth.activeTuntasId || !addUnitId) return; void execute("add-unit", "Narys pridėtas į vienetą.", () => api.addOrganizationalUnitMember(auth.token, auth.activeTuntasId!, addUnitId, { userId: detail.userId, assignmentType: "MEMBER" })).then(() => setAddUnitId("")); }
  function moveMember(fromUnitId: string) { const target = moveTargets[fromUnitId]; if (!detail || !auth?.token || !auth.activeTuntasId || !target) return; void execute(`move-${fromUnitId}`, "Narys perkeltas į kitą vienetą.", () => api.moveOrganizationalUnitMember(auth.token, auth.activeTuntasId!, target, detail.userId)); }
  function toggleVisibility(unitId: string, visible: boolean) { if (!detail || !auth?.token || !auth.activeTuntasId) return; void execute(`visibility-${unitId}`, "Nario matomumas atnaujintas.", () => api.updateOrganizationalUnitMemberVisibility(auth.token, auth.activeTuntasId!, unitId, detail.userId, { isPubliclyVisible: visible })); }
  function removeFromUnit(unitId: string) { if (!detail || !auth?.token || !auth.activeTuntasId || !window.confirm("Pašalinti narį iš šio vieneto?")) return; void execute(`remove-unit-${unitId}`, "Narys pašalintas iš vieneto.", () => api.removeOrganizationalUnitMember(auth.token, auth.activeTuntasId!, unitId, detail.userId)); }
  function removeMember() { if (!detail || !auth?.token || !auth.activeTuntasId || !window.confirm("Pašalinti narį iš tunto? Šis veiksmas nutrauks aktyvias jo roles ir narystes.")) return; setBusy("remove-member"); api.removeMember(auth.token, auth.activeTuntasId, detail.userId).then(() => { onMemberRemoved(detail.userId); onClose(); }).catch((cause) => { setError(messageOf(cause, "Nario pašalinti nepavyko.")); setBusy(null); }); }

  const leadershipRoles = useMemo(() => roles.filter((role) => role.roleType === "LEADERSHIP"), [roles]);
  const selectedLeadershipRole = leadershipRoles.find((role) => role.id === leadershipRoleId);
  const roleRequiresUnit = selectedLeadershipRole ? unitScopedLeadershipRoleNames.has(selectedLeadershipRole.name) : false;
  const rankRoles = useMemo(() => roles.filter((role) => role.roleType === "RANK"), [roles]);
  const availableUnits = units.filter((unit) => !(detail?.unitAssignments ?? []).some((assignment) => assignment.organizationalUnitId === unit.id));

  return <SkautaiPanel open={Boolean(member)} title={detail ? memberName(detail) : "Narys"} description={detail ? primaryRole(detail) : undefined} onClose={onClose}>
    {detail && <div className="member-management-panel">{error && <p className="inline-alert">{error}</p>}{message && <p className="inline-success">{message}</p>}
      <div className="segmented-tabs member-management-tabs" role="tablist"><Tab active={tab === "profile"} label="Profilis" onClick={() => setTab("profile")} /><Tab active={tab === "leadership"} label="Rolės ir laipsniai" onClick={() => setTab("leadership")} /><Tab active={tab === "units"} label="Vienetai" onClick={() => setTab("units")} /></div>
      {tab === "profile" && <div className="member-detail-content"><section className="member-detail-section"><h3>Kontaktai</h3><dl className="member-detail-list"><div><dt>El. paštas</dt><dd>{detail.email}</dd></div><div><dt>Telefonas</dt><dd>{detail.phone?.trim() || "–"}</dd></div><div><dt>Įstojo</dt><dd>{formatDate(detail.joinedAt)}</dd></div><div><dt>Matomumas</dt><dd>{detail.isIdentityHidden ? "Tapatybė ribojama" : "Įprastas"}</dd></div></dl></section><section className="member-detail-section"><h3>Organizacijos suvestinė</h3><dl className="member-detail-list"><div><dt>Aktyvios rolės</dt><dd>{(detail.leadershipRoles ?? []).length}</dd></div><div><dt>Laipsniai</dt><dd>{(detail.ranks ?? []).map((rank) => roleLabel(rank.roleName)).join(", ") || "–"}</dd></div><div><dt>Vienetai</dt><dd>{(detail.unitAssignments ?? []).map((assignment) => assignment.organizationalUnitName).join(", ") || "–"}</dd></div></dl></section>{canRemoveMembers && !isSelf && <section className="member-danger-zone"><div><h3>Pašalinti iš tunto</h3><p>Naudokite tik kai narystė iš tikrųjų baigiama.</p></div><button className="primary-button tone-danger" type="button" disabled={Boolean(busy)} onClick={removeMember}><UserMinus size={17} />Pašalinti narį</button></section>}</div>}
      {tab === "leadership" && <div className="member-detail-content">{canManageMembers && <><form className="form-panel member-inline-form" onSubmit={assignLeadership}><div className="form-section-heading"><ShieldCheck /><div><h3>Priskirti vadovavimo rolę</h3><span>Organizacinis kontekstas ir kadencijos datos tikrinami serveryje.</span></div></div><div className="form-grid"><label className="form-field"><span>Rolė *</span><select value={leadershipRoleId} onChange={(event) => { setLeadershipRoleId(event.target.value); setLeadershipUnitId(""); }} required><option value="">Pasirinkite</option>{leadershipRoles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>)}</select></label><label className="form-field"><span>Vienetas{roleRequiresUnit ? " *" : ""}</span><select value={leadershipUnitId} onChange={(event) => setLeadershipUnitId(event.target.value)} required={roleRequiresUnit} disabled={Boolean(selectedLeadershipRole && !roleRequiresUnit)}><option value="">Tunto lygmuo</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label className="form-field"><span>Pradžia</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label><label className="form-field"><span>Pabaiga</span><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label></div><div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}><Plus size={16} />Priskirti</button></div></form><form className="form-panel member-inline-form" onSubmit={assignRank}><div className="form-section-heading"><Award /><div><h3>Priskirti patyrimo laipsnį</h3><span>Galimi tunto rolėse sukonfigūruoti laipsniai.</span></div></div><label className="form-field"><span>Laipsnis *</span><select value={rankRoleId} onChange={(event) => setRankRoleId(event.target.value)} required><option value="">Pasirinkite</option>{rankRoles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>)}</select></label><div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}>Priskirti</button></div></form></>}
        <section className="member-detail-section"><h3>Aktyvios vadovavimo rolės</h3>{(detail.leadershipRoles ?? []).length === 0 ? <p>Aktyvių vadovavimo rolių nėra.</p> : <div className="workspace-card-grid">{(detail.leadershipRoles ?? []).map((assignment) => <article className="workspace-record-card" key={assignment.id}><span className="record-icon"><ShieldCheck size={17} /></span><div><strong>{roleLabel(assignment.roleName)}</strong><span>{assignment.organizationalUnitName ?? "Tunto lygmuo"}</span><small>{assignment.termStatus} · kadencija {assignment.termNumber}</small></div>{(canManageMembers || isSelf) && <div className="row-actions">{isSelf && assignment.termStatus === "ACTIVE" && <button className="icon-button" type="button" title="Pateikti atsistatydinimo prašymą" onClick={() => requestResignation(assignment.id)}><UserMinus size={16} /></button>}<button className="icon-button danger-icon-button" type="button" title={isSelf ? "Pasitraukti" : "Užbaigti rolę"} onClick={() => removeLeadership(assignment.id)}><Trash2 size={16} /></button></div>}</article>)}</div>}{isSelf && <label className="form-field"><span>Atsistatydinimo priežastis (nebūtina)</span><textarea rows={2} value={resignationReason} onChange={(event) => setResignationReason(event.target.value)} /></label>}</section>
        <section className="member-detail-section"><h3>Patyrimo laipsniai</h3>{(detail.ranks ?? []).length === 0 ? <p>Laipsnių nėra.</p> : <div className="workspace-card-grid">{(detail.ranks ?? []).map((rank) => <article className="workspace-record-card" key={rank.id}><span className="record-icon"><Award size={17} /></span><div><strong>{roleLabel(rank.roleName)}</strong><span>Priskirta {formatDate(rank.assignedAt)}</span></div>{canManageMembers && <button className="icon-button danger-icon-button" type="button" onClick={() => removeRank(rank.id)}><Trash2 size={16} /></button>}</article>)}</div>}</section>
      </div>}
      {tab === "units" && <div className="member-detail-content">{canManageUnits && availableUnits.length > 0 && <form className="form-panel member-inline-form" onSubmit={addToUnit}><div className="form-section-heading"><Network /><div><h3>Pridėti į vienetą</h3><span>Rodomi vienetai, kuriems narystė dar nepriskirta.</span></div></div><div className="inline-workspace-form"><select value={addUnitId} onChange={(event) => setAddUnitId(event.target.value)} required><option value="">Pasirinkite vienetą</option>{availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}><Plus size={16} />Pridėti</button></div></form>}
        <section className="member-detail-section"><h3>Aktyvios vienetų narystės</h3>{(detail.unitAssignments ?? []).length === 0 ? <p>Narys nepriskirtas vienetui.</p> : <div className="workspace-card-grid">{(detail.unitAssignments ?? []).map((assignment) => <article className="workspace-summary-card" key={assignment.id}><span className="record-icon"><UsersRound size={17} /></span><div><strong>{assignment.organizationalUnitName}</strong><span>{assignmentTypeLabel(assignment.assignmentType)}</span><small>Nuo {formatDate(assignment.joinedAt)} · {assignment.isPubliclyVisible === false ? "tapatybė paslėpta" : "matomas"}</small></div>{canManageUnits && <div className="workspace-card-actions"><label className="toggle-field"><input type="checkbox" checked={assignment.isPubliclyVisible !== false} onChange={(event) => toggleVisibility(assignment.organizationalUnitId, event.target.checked)} />Viešas matomumas</label><select value={moveTargets[assignment.organizationalUnitId] ?? ""} onChange={(event) => setMoveTargets((current) => ({ ...current, [assignment.organizationalUnitId]: event.target.value }))}><option value="">Perkelti į...</option>{units.filter((unit) => unit.id !== assignment.organizationalUnitId).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><button className="secondary-button" type="button" onClick={() => moveMember(assignment.organizationalUnitId)}>Perkelti</button><button className="icon-button danger-icon-button" type="button" onClick={() => removeFromUnit(assignment.organizationalUnitId)}><Trash2 size={16} /></button></div>}</article>)}</div>}</section>
      </div>}
    </div>}
  </SkautaiPanel>;
}

function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button className={active ? "active" : ""} type="button" role="tab" aria-selected={active} onClick={onClick}>{label}</button>; }
function memberName(member: Member) { return [member.name, member.surname].filter(Boolean).join(" ") || member.email; }
function primaryRole(member: Member) { return roleLabel(member.leadershipRoles?.[0]?.roleName ?? member.ranks?.[0]?.roleName ?? "eilinis_narys"); }
function optional(value: string) { const trimmed = value.trim(); return trimmed ? trimmed : null; }
function toInstant(value: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function isMember(value: unknown): value is Member { return Boolean(value && typeof value === "object" && "userId" in value && "email" in value); }
function messageOf(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date); }
