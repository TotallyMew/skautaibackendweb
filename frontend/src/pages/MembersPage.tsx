import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Search, ShieldCheck, UsersRound } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { Member, MemberListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";

export function MembersPage() {
  const { auth } = useAuth();
  const [membersState, setMembersState] = useState<MemberListResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(auth?.token && auth.activeTuntasId);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) {
      setMembersState(null);
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
          setError(cause instanceof ApiError ? cause.message : "Nepavyko uzkrauti nariu.");
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
  }, [auth?.activeTuntasId, auth?.token, reloadKey]);

  const activeTuntasName = useMemo(
    () => auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId)?.name,
    [auth?.activeTuntasId, auth?.tuntai]
  );

  const filteredMembers = useMemo(() => {
    const members = membersState?.members ?? [];
    const normalized = query.toLowerCase();
    if (!normalized) return members;
    return members.filter((member) => {
      const haystack = [
        member.name,
        member.surname,
        member.email,
        member.phone ?? "",
        ...member.unitAssignments.map((unit) => unit.organizationalUnitName),
        ...member.leadershipRoles.map((role) => role.roleName),
        ...member.ranks.map((rank) => rank.roleName)
      ].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [membersState?.members, query]);

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
            placeholder="Ieskoti pagal varda, el. pasta, vieneta, role..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <button className="primary-button" type="submit">
          <Search size={17} aria-hidden="true" />
          Ieskoti
        </button>
        <button className="secondary-button" type="button" onClick={resetSearch}>
          Valyti
        </button>
      </form>

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="data-panel">
        <div className="data-panel-header">
          <span>{filteredMembers.length} rodoma</span>
          <span>{membersState?.total ?? 0} is viso</span>
        </div>

        {isLoading && (
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunami nariai...
          </div>
        )}

        {!isLoading && !error && filteredMembers.length === 0 && (
          <div className="empty-state">
            <UsersRound size={28} aria-hidden="true" />
            <strong>Nariu nerasta</strong>
            <span>Pakeisk paieska arba atnaujink sarasa.</span>
          </div>
        )}

        {!isLoading && !error && filteredMembers.length > 0 && (
          <MembersTable members={filteredMembers} />
        )}
      </div>
    </section>
  );
}

function MembersTable({ members }: { members: Member[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Narys</th>
            <th>Kontaktai</th>
            <th>Vienetai</th>
            <th>Vadovavimas</th>
            <th>Laipsniai</th>
            <th>Istojo</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.userId}>
              <td>
                <strong>{member.name} {member.surname}</strong>
                {member.isIdentityHidden && <span className="muted-with-icon"><ShieldCheck size={14} aria-hidden="true" /> Paslepta tapatybe</span>}
              </td>
              <td>
                <strong>{member.email}</strong>
                <span>{member.phone ?? "-"}</span>
              </td>
              <td>{summarizeUnits(member)}</td>
              <td>{summarizeLeadership(member)}</td>
              <td>{summarizeRanks(member)}</td>
              <td>{formatDate(member.joinedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function summarizeUnits(member: Member) {
  if (member.unitAssignments.length === 0) return "-";
  return member.unitAssignments.map((unit) => `${unit.organizationalUnitName} (${unit.assignmentType})`).join(", ");
}

function summarizeLeadership(member: Member) {
  if (member.leadershipRoles.length === 0) return "-";
  return member.leadershipRoles
    .map((role) => role.organizationalUnitName ? `${role.roleName} / ${role.organizationalUnitName}` : role.roleName)
    .join(", ");
}

function summarizeRanks(member: Member) {
  if (member.ranks.length === 0) return "-";
  return member.ranks.map((rank) => rank.roleName).join(", ");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium"
  }).format(date);
}
