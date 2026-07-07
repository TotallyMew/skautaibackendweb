import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, PackageSearch, RefreshCw, Search } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { Item, ItemListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";

const pageSize = 25;

const statusOptions = [
  { value: "", label: "Visos busenos" },
  { value: "ACTIVE", label: "Aktyvus" },
  { value: "PENDING_APPROVAL", label: "Laukia tvirtinimo" },
  { value: "INACTIVE", label: "Neaktyvus" }
];

const typeOptions = [
  { value: "", label: "Visi tipai" },
  { value: "SHARED", label: "Bendras" },
  { value: "UNIT", label: "Draugoves" },
  { value: "INDIVIDUAL", label: "Asmeninis" }
];

export function InventoryPage() {
  const { auth } = useAuth();
  const [itemsState, setItemsState] = useState<ItemListResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [sharedOnly, setSharedOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(auth?.token && auth.activeTuntasId);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) {
      setItemsState(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .listItems(auth.token, auth.activeTuntasId, {
        q: query,
        status,
        type,
        category,
        sharedOnly,
        limit: pageSize,
        offset
      })
      .then((response) => {
        if (!isCancelled) {
          setItemsState(response);
        }
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof ApiError ? cause.message : "Nepavyko uzkrauti inventoriaus.");
          setItemsState(null);
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
  }, [auth?.activeTuntasId, auth?.token, category, offset, query, sharedOnly, status, type]);

  const activeTuntasName = useMemo(
    () => auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId)?.name,
    [auth?.activeTuntasId, auth?.tuntai]
  );

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOffset(0);
    setQuery(searchInput.trim());
  }

  function resetFilters() {
    setSearchInput("");
    setQuery("");
    setStatus("");
    setType("");
    setCategory("");
    setSharedOnly(false);
    setOffset(0);
  }

  const total = itemsState?.total ?? 0;
  const currentPage = Math.floor(offset / pageSize) + 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="inventory-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{activeTuntasName ?? "Tuntas nepasirinktas"}</span>
          <h2>Inventorius</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => setOffset(0)} disabled={!canFetch || isLoading}>
          <RefreshCw size={17} aria-hidden="true" />
          Atnaujinti
        </button>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Ieskoti pagal pavadinima, kategorija, bukle..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <select value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select value={type} onChange={(event) => { setType(event.target.value); setOffset(0); }}>
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input
          className="compact-input"
          placeholder="Kategorija"
          value={category}
          onChange={(event) => { setCategory(event.target.value); setOffset(0); }}
        />

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={sharedOnly}
            onChange={(event) => { setSharedOnly(event.target.checked); setOffset(0); }}
          />
          Tik bendras
        </label>

        <button className="primary-button" type="submit">
          <Search size={17} aria-hidden="true" />
          Ieskoti
        </button>

        <button className="secondary-button" type="button" onClick={resetFilters}>
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
          <span>{total} irasu</span>
          <span>Puslapis {currentPage} / {pageCount}</span>
        </div>

        {isLoading && (
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunamas inventorius...
          </div>
        )}

        {!isLoading && !error && itemsState?.items.length === 0 && (
          <div className="empty-state">
            <PackageSearch size={28} aria-hidden="true" />
            <strong>Inventoriaus pagal siuos filtrus nerasta</strong>
            <span>Pakeisk paieska arba filtrus ir bandyk dar karta.</span>
          </div>
        )}

        {!isLoading && !error && Boolean(itemsState?.items.length) && (
          <InventoryTable items={itemsState?.items ?? []} />
        )}
      </div>

      <div className="pagination-row">
        <button
          className="icon-button"
          type="button"
          disabled={offset === 0 || isLoading}
          onClick={() => setOffset(Math.max(0, offset - pageSize))}
          aria-label="Ankstesnis puslapis"
          title="Ankstesnis puslapis"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          disabled={!itemsState?.hasMore || isLoading}
          onClick={() => setOffset(offset + pageSize)}
          aria-label="Kitas puslapis"
          title="Kitas puslapis"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function InventoryTable({ items }: { items: Item[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Pavadinimas</th>
            <th>Kategorija</th>
            <th>Kiekis</th>
            <th>Saugotojas</th>
            <th>Lokacija</th>
            <th>Busena</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.name}</strong>
                <span>{item.description || item.condition}</span>
              </td>
              <td>
                <strong>{item.category}</strong>
                <span>{item.type}</span>
              </td>
              <td>
                <strong className={item.isLowStock ? "danger-text" : undefined}>
                  {item.quantity} {item.unitOfMeasure ?? "vnt."}
                </strong>
                {item.minimumQuantity != null && <span>Min. {item.minimumQuantity}</span>}
              </td>
              <td>{item.custodianName ?? "Bendras tuntas"}</td>
              <td>{item.locationPath ?? item.locationName ?? item.temporaryStorageLabel ?? "-"}</td>
              <td><StatusBadge status={item.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll("_", " ");
  return <span className={`status-badge status-${status.toLowerCase()}`}>{normalized}</span>;
}
