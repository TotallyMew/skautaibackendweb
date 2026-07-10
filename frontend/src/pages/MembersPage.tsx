import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { api } from "../api/client";
import type { Member, MemberListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  SkautaiDataTable,
  SkautaiEmptyState,
  SkautaiErrorState,
  SkautaiPageShell,
  SkautaiPanel,
  SkautaiSearchBar,
  SkautaiStatusPill,
  SkautaiTableFooter,
  SkautaiToolbar,
  type SkautaiDataTableColumn
} from "../components/ui/Skautai";
import { assignmentTypeLabel, finiteCount, roleLabel } from "../utils/display";

const leadersFilter = "__leaders__";

export function MembersPage() {
  const { auth } = useAuth();
  const [membersState, setMembersState] = useState<MemberListResponse | null>(null);
  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canViewMembers = auth?.permissions.some((permission) => permission === "members.view" || permission.startsWith("members.view:")) ?? false;
  const canFetch = Boolean(auth?.token && auth.activeTuntasId && canViewMembers);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canViewMembers) {
      setMembersState(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api.listMembers(auth.token, auth.activeTuntasId)
      .then((response) => {
        if (!isCancelled) setMembersState(response);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Nepavyko užkrauti narių.");
          setMembersState(null);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, canViewMembers, reloadKey]);

  const members = membersState?.members ?? [];
  const unitOptions = useMemo(() => collectUnitNames(members), [members]);
  const roleOptions = useMemo(() => collectRoleNames(members), [members]);
  const filteredMembers = useMemo(() => filterMembers(members, query, unitFilter, roleFilter), [members, query, roleFilter, unitFilter]);
  const total = finiteCount(membersState?.total);

  useEffect(() => {
    if (unitFilter && !unitOptions.includes(unitFilter)) setUnitFilter("");
    if (roleFilter && roleFilter !== leadersFilter && !roleOptions.includes(roleFilter)) setRoleFilter("");
  }, [roleFilter, roleOptions, unitFilter, unitOptions]);

  const actions = (
    <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={!canFetch || isLoading}>
      <RefreshCw size={17} aria-hidden="true" />
      Atnaujinti
    </button>
  );

  return (
    <SkautaiPageShell
      className="members-page"
      eyebrow="Organizacija"
      title="Nariai"
      description="Ieškokite narių pagal vardą, vienetą ar vaidmenį ir peržiūrėkite kontaktinę bei organizacinę informaciją."
      actions={actions}
      width="wide"
    >
      {canViewMembers && (
        <SkautaiToolbar title="Paieška ir filtrai" meta={`${filteredMembers.length} rodoma`}>
          <div className="filter-bar member-directory-filters management-filter-bar">
            <SkautaiSearchBar value={query} onChange={setQuery} placeholder="Ieškoti pagal vardą, el. paštą, telefoną ar vienetą..." />
            <select value={unitFilter} aria-label="Vienetas" onChange={(event) => setUnitFilter(event.target.value)}>
              <option value="">Visi vienetai</option>
              {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
            <select value={roleFilter} aria-label="Vaidmuo" onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Visi vaidmenys</option>
              <option value={leadersFilter}>Tik vadovai</option>
              {roleOptions.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
            {(query || unitFilter || roleFilter) && (
              <button className="filter-clear-button" type="button" onClick={() => { setQuery(""); setUnitFilter(""); setRoleFilter(""); }}>
                Valyti
              </button>
            )}
          </div>
        </SkautaiToolbar>
      )}

      {error && <SkautaiErrorState description={error} />}

      <section className="data-panel" aria-label="Narių sąrašas">
        {!canViewMembers && (
          <SkautaiEmptyState icon={ShieldCheck} title="Narių sąrašui reikia teisės" description="Ši sritis rodoma tik vartotojams, kurie turi narių peržiūros teisę." />
        )}
        {canViewMembers && isLoading && (
          <div className="table-state"><Loader2 className="spin" size={22} aria-hidden="true" />Kraunami nariai...</div>
        )}
        {canViewMembers && !isLoading && !error && filteredMembers.length === 0 && (
          <SkautaiEmptyState
            icon={UsersRound}
            title={members.length === 0 ? "Narių dar nėra" : "Nieko nerasta"}
            description={members.length === 0 ? "Nariai bus rodomi pagal jūsų turimas peržiūros teises." : "Pakeiskite paiešką arba pasirinktus filtrus."}
          />
        )}
        {canViewMembers && !isLoading && !error && filteredMembers.length > 0 && (
          <MembersTable members={filteredMembers} onOpen={setSelectedMember} />
        )}
        {canViewMembers && !error && <SkautaiTableFooter meta={`${filteredMembers.length} rodoma · ${total} iš viso`} />}
      </section>

      <MemberDetailsPanel member={selectedMember} onClose={() => setSelectedMember(null)} />
    </SkautaiPageShell>
  );
}

function MembersTable({ members, onOpen }: { members: Member[]; onOpen: (member: Member) => void }) {
  const columns: Array<SkautaiDataTableColumn<Member>> = [
    {
      key: "member",
      header: "Narys",
      cell: (member) => (
        <div className="member-table-identity">
          <span className="member-avatar">{initials(member)}</span>
          <div>
            <strong>{displayName(member)}</strong>
            {member.isIdentityHidden && <span className="muted-with-icon"><ShieldCheck size={13} aria-hidden="true" /> Paslėpta tapatybė</span>}
          </div>
        </div>
      )
    },
    {
      key: "role",
      header: "Vaidmuo",
      cell: (member) => <><strong>{primaryRole(member)}</strong><span>{summarizeRanks(member)}</span></>
    },
    {
      key: "unit",
      header: "Vienetas",
      cell: (member) => summarizeUnits(member)
    },
    {
      key: "contact",
      header: "Kontaktai",
      cell: (member) => <><strong>{member.phone?.trim() || "—"}</strong><span>{member.email}</span></>
    },
    {
      key: "joined",
      header: "Įstojo",
      className: "mobile-secondary-column",
      cell: (member) => formatDate(member.joinedAt)
    },
    {
      key: "visibility",
      header: "Matomumas",
      className: "mobile-secondary-column",
      cell: (member) => member.isIdentityHidden
        ? <SkautaiStatusPill tone="muted">Ribotas</SkautaiStatusPill>
        : <span>Įprastas</span>
    },
    {
      key: "actions",
      header: "",
      mobileLabel: "Veiksmai",
      className: "table-actions-cell",
      cell: (member) => (
        <button className="icon-button" type="button" onClick={() => onOpen(member)} aria-label={`Peržiūrėti ${displayName(member)}`} title="Peržiūrėti">
          <Eye size={17} aria-hidden="true" />
        </button>
      )
    }
  ];

  return <SkautaiDataTable rows={members} columns={columns} getRowKey={(member) => member.userId} className="management-data-table members-data-table" />;
}

function MemberDetailsPanel({ member, onClose }: { member: Member | null; onClose: () => void }) {
  return (
    <SkautaiPanel
      open={Boolean(member)}
      title={member ? displayName(member) : "Narys"}
      description={member ? primaryRole(member) : undefined}
      onClose={onClose}
    >
      {member && (
        <div className="member-detail-content">
          <section className="member-detail-section">
            <h3>Kontaktai</h3>
            <dl className="member-detail-list">
              <div><dt>El. paštas</dt><dd>{member.email}</dd></div>
              <div><dt>Telefonas</dt><dd>{member.phone?.trim() || "—"}</dd></div>
              <div><dt>Įstojo</dt><dd>{formatDate(member.joinedAt)}</dd></div>
            </dl>
          </section>
          <section className="member-detail-section">
            <h3>Organizacija</h3>
            <dl className="member-detail-list">
              <div><dt>Vienetai</dt><dd>{summarizeUnits(member)}</dd></div>
              <div><dt>Vadovavimo pareigos</dt><dd>{summarizeLeadership(member)}</dd></div>
              <div><dt>Laipsniai</dt><dd>{summarizeRanks(member)}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </SkautaiPanel>
  );
}

function filterMembers(members: Member[], query: string, unitFilter: string, roleFilter: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("lt-LT");
  return [...members]
    .filter((member) => !unitFilter || memberUnitNames(member).includes(unitFilter))
    .filter((member) => {
      if (!roleFilter) return true;
      if (roleFilter === leadersFilter) return safeLeadershipRoles(member).length > 0;
      return memberRoleNames(member).includes(roleFilter);
    })
    .filter((member) => {
      if (!normalizedQuery) return true;
      const haystack = [
        displayName(member),
        member.email,
        member.phone ?? "",
        ...memberUnitNames(member),
        ...memberRoleNames(member).map(roleLabel)
      ].join(" ").toLocaleLowerCase("lt-LT");
      return haystack.includes(normalizedQuery);
    })
    .sort((left, right) => displayName(left).localeCompare(displayName(right), "lt"));
}

function collectUnitNames(members: Member[]) {
  return Array.from(new Set(members.flatMap(memberUnitNames))).sort((left, right) => left.localeCompare(right, "lt"));
}

function collectRoleNames(members: Member[]) {
  return Array.from(new Set(members.flatMap(memberRoleNames))).sort((left, right) => roleLabel(left).localeCompare(roleLabel(right), "lt"));
}

function memberUnitNames(member: Member) {
  return [
    ...safeUnitAssignments(member).map((unit) => unit.organizationalUnitName),
    ...safeLeadershipRoles(member).map((role) => role.organizationalUnitName).filter((name): name is string => Boolean(name))
  ];
}

function memberRoleNames(member: Member) {
  return [
    ...safeLeadershipRoles(member).map((role) => role.roleName),
    ...safeRanks(member).map((rank) => rank.roleName)
  ];
}

function safeUnitAssignments(member: Member) {
  return member.unitAssignments ?? [];
}

function safeLeadershipRoles(member: Member) {
  return member.leadershipRoles ?? [];
}

function safeRanks(member: Member) {
  return member.ranks ?? [];
}

function displayName(member: Member) {
  const name = [member.name, member.surname].map(toDisplayNamePart).filter(Boolean).join(" ");
  return name || toDisplayNamePart(member.email.split("@")[0]);
}

function initials(member: Member) {
  return displayName(member).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("lt-LT")).join("") || "?";
}

function toDisplayNamePart(value: string) {
  return value.trim().toLocaleLowerCase("lt-LT").split(" ").filter(Boolean)
    .map((word) => word.split("-").map((part) => part.charAt(0).toLocaleUpperCase("lt-LT") + part.slice(1)).join("-"))
    .join(" ");
}

function primaryRole(member: Member) {
  const leadership = safeLeadershipRoles(member)[0]?.roleName;
  if (leadership) return roleLabel(leadership);
  const rank = safeRanks(member)[0]?.roleName;
  return rank ? roleLabel(rank) : "Narys";
}

function summarizeUnits(member: Member) {
  const assignments = safeUnitAssignments(member);
  if (assignments.length === 0) return safeLeadershipRoles(member)[0]?.organizationalUnitName ?? "Be vieneto";
  return assignments.map((unit) => `${unit.organizationalUnitName} (${assignmentTypeLabel(unit.assignmentType)})`).join(", ");
}

function summarizeLeadership(member: Member) {
  const roles = safeLeadershipRoles(member);
  if (roles.length === 0) return "—";
  return roles.map((role) => role.organizationalUnitName ? `${roleLabel(role.roleName)} · ${role.organizationalUnitName}` : roleLabel(role.roleName)).join(", ");
}

function summarizeRanks(member: Member) {
  const ranks = safeRanks(member);
  if (ranks.length === 0) return "—";
  return ranks.map((rank) => roleLabel(rank.roleName)).join(", ");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date);
}
