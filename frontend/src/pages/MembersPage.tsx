import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Search, ShieldCheck, UsersRound } from "lucide-react";
import { api } from "../api/client";
import type { Member, MemberListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { assignmentTypeLabel, roleLabel } from "../utils/display";

export function MembersPage() {
  const { auth } = useAuth();
  const [membersState, setMembersState] = useState<MemberListResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Visi");
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

    api
      .listMembers(auth.token, auth.activeTuntasId)
      .then((response) => {
        if (!isCancelled) {
          setMembersState(response);
        }
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Nepavyko užkrauti narių.");
          setMembersState(null);
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
  }, [auth?.activeTuntasId, auth?.token, canViewMembers, reloadKey]);

  const activeTuntasName = useMemo(
    () => auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId)?.name,
    [auth?.activeTuntasId, auth?.tuntai]
  );

  const filteredMembers = useMemo(() => {
    const members = (membersState?.members ?? []).filter((member) => memberMatchesFilter(member, selectedFilter));
    const normalized = query.toLowerCase();
    if (!normalized) return members;
    return members.filter((member) => {
      const haystack = [
        member.name,
        member.surname,
        member.email,
        member.phone ?? "",
        ...safeUnitAssignments(member).map((unit) => unit.organizationalUnitName),
        ...safeLeadershipRoles(member).map((role) => role.roleName),
        ...safeRanks(member).map((rank) => rank.roleName)
      ].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [membersState?.members, query, selectedFilter]);

  const unitFilters = useMemo(() => {
    const names = (membersState?.members ?? [])
      .flatMap((member) => [
        ...safeUnitAssignments(member).map((unit) => unit.organizationalUnitName),
        ...safeLeadershipRoles(member).map((role) => role.organizationalUnitName).filter(Boolean)
      ])
      .filter((name): name is string => Boolean(name));
    return ["Visi", "Vadovai", ...Array.from(new Set(names)).sort((left, right) => left.localeCompare(right, "lt"))];
  }, [membersState?.members]);

  useEffect(() => {
    if (!unitFilters.includes(selectedFilter)) {
      setSelectedFilter("Visi");
    }
  }, [selectedFilter, unitFilters]);

  const groupedMembers = useMemo(() => {
    return [...filteredMembers]
      .sort((left, right) => primaryUnitName(left).localeCompare(primaryUnitName(right), "lt") || displayName(left).localeCompare(displayName(right), "lt"))
      .reduce<Record<string, Member[]>>((groups, member) => {
        const unitName = primaryUnitName(member);
        groups[unitName] = groups[unitName] ?? [];
        groups[unitName].push(member);
        return groups;
      }, {});
  }, [filteredMembers]);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput.trim());
  }

  function resetSearch() {
    setSearchInput("");
    setQuery("");
  }

  return (
    <section className="inventory-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{activeTuntasName ?? "Tuntas nepasirinktas"}</span>
          <h2>Nariai ir vienetai</h2>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={!canFetch || isLoading}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Atnaujinti
        </button>
      </div>

      <form className="filter-bar member-filter-bar" onSubmit={applySearch}>
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Ieškoti pagal vardą, el. paštą, vienetą, vaidmenį..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <button className="primary-button" type="submit">
          <Search size={17} aria-hidden="true" />
          Ieškoti
        </button>
        <button className="secondary-button" type="button" onClick={resetSearch}>
          Valyti
        </button>
      </form>

      {unitFilters.length > 2 && (
        <div className="chip-row" aria-label="Narių filtrai">
          {unitFilters.map((filter) => (
            <button
              className={`filter-chip${selectedFilter === filter ? " selected" : ""}`}
              key={filter}
              type="button"
              onClick={() => setSelectedFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="data-panel">
        <div className="data-panel-header">
          <span>{filteredMembers.length} rodoma</span>
          <span>{membersState?.total ?? 0} iš viso</span>
        </div>

        {!canViewMembers && (
          <div className="empty-state">
            <ShieldCheck size={28} aria-hidden="true" />
            <strong>Narių sąrašui reikia teisės</strong>
            <span>Android programėlėje šis meniu rodomas tik vartotojams, kurie turi narių peržiūros teisę.</span>
          </div>
        )}

        {canViewMembers && isLoading && (
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunami nariai...
          </div>
        )}

        {canViewMembers && !isLoading && !error && filteredMembers.length === 0 && (
          <div className="empty-state">
            <UsersRound size={28} aria-hidden="true" />
            <strong>{membersState?.members.length === 0 ? "Narių dar nėra" : "Nieko nerasta"}</strong>
            <span>{membersState?.members.length === 0 ? "Čia matysi savo vieneto arba tunto narius pagal turimas teises." : "Pabandyk ieškoti pagal vardą, el. paštą, telefoną, pareigas ar vienetą."}</span>
          </div>
        )}

        {canViewMembers && !isLoading && !error && filteredMembers.length > 0 && (
          <MemberGroups groups={groupedMembers} />
        )}
      </div>
    </section>
  );
}

function MemberGroups({ groups }: { groups: Record<string, Member[]> }) {
  return (
    <div className="member-groups">
      {Object.entries(groups).map(([unitName, members]) => (
        <section className="member-group" key={unitName}>
          <h3>{unitName}</h3>
          <div className="member-list">
            {members.map((member) => (
              <MemberRow member={member} key={member.userId} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  const phone = member.phone?.trim();
  return (
    <article className="member-row">
      <span className="member-avatar">{initials(member)}</span>
      <div className="member-row-main">
        <div className="member-row-title">
          <strong>{displayName(member)}</strong>
          {member.isIdentityHidden && <span className="muted-with-icon"><ShieldCheck size={14} aria-hidden="true" /> Paslėpta tapatybė</span>}
        </div>
        <span>{contextSubtitle(member)}</span>
        {member.email && <span>{member.email}</span>}
      </div>
      <div className="member-row-meta">
        <strong>{phone || "Telefono nėra"}</strong>
        <span>Įstojo {formatDate(member.joinedAt)}</span>
      </div>
    </article>
  );
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

function primaryUnitName(member: Member) {
  return safeUnitAssignments(member)[0]?.organizationalUnitName
    ?? safeLeadershipRoles(member)[0]?.organizationalUnitName
    ?? "Be vieneto";
}

function displayName(member: Member) {
  const name = [member.name, member.surname]
    .map((part) => toDisplayNamePart(part))
    .filter(Boolean)
    .join(" ");
  return name || toDisplayNamePart(member.email.split("@")[0]);
}

function contextSubtitle(member: Member) {
  return safeLeadershipRoles(member)[0]?.roleName
    ? roleLabel(safeLeadershipRoles(member)[0].roleName)
    : safeRanks(member)[0]?.roleName
      ? roleLabel(safeRanks(member)[0].roleName)
      : summarizeUnits(member);
}

function initials(member: Member) {
  return displayName(member)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("lt-LT"))
    .join("") || "?";
}

function toDisplayNamePart(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("lt-LT")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.split("-").map((part) => part.charAt(0).toLocaleUpperCase("lt-LT") + part.slice(1)).join("-"))
    .join(" ");
}

function summarizeUnits(member: Member) {
  if (safeUnitAssignments(member).length === 0) return "Be vieneto";
  return safeUnitAssignments(member).map((unit) => `${unit.organizationalUnitName} (${assignmentTypeLabel(unit.assignmentType)})`).join(", ");
}

function summarizeLeadership(member: Member) {
  if (safeLeadershipRoles(member).length === 0) return "-";
  return safeLeadershipRoles(member)
    .map((role) => role.organizationalUnitName ? `${roleLabel(role.roleName)} / ${role.organizationalUnitName}` : roleLabel(role.roleName))
    .join(", ");
}

function summarizeRanks(member: Member) {
  if (safeRanks(member).length === 0) return "-";
  return safeRanks(member).map((rank) => roleLabel(rank.roleName)).join(", ");
}

function memberMatchesFilter(member: Member, filter: string) {
  if (filter === "Visi") return true;
  if (filter === "Vadovai") return safeLeadershipRoles(member).length > 0;
  return safeUnitAssignments(member).some((unit) => unit.organizationalUnitName === filter) ||
    safeLeadershipRoles(member).some((role) => role.organizationalUnitName === filter);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium"
  }).format(date);
}
