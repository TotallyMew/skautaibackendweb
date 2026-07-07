import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, PackageSearch, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Item, ItemListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { countLabel, itemTypeLabel, statusLabel } from "../utils/display";

const pageSize = 25;

const statusOptions = [
  { value: "", label: "Visos būsenos" },
  { value: "ACTIVE", label: "Aktyvus" },
  { value: "PENDING_APPROVAL", label: "Laukia tvirtinimo" },
  { value: "INACTIVE", label: "Neaktyvus" }
];

const typeOptions = [
  { value: "", label: "Visi tipai" },
  { value: "COLLECTIVE", label: "Bendras" },
  { value: "ASSIGNED", label: "Priskirtas" },
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
      .catch(() => {
        if (!isCancelled) {
          setError("Nepavyko užkrauti inventoriaus.");
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
            placeholder="Ieškoti pagal pavadinimą, kategoriją, būklę..."
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
          Ieškoti
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
          <span>{total} {countLabel(total, "įrašas", "įrašai", "įrašų")}</span>
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
            <strong>Inventoriaus pagal šiuos filtrus nerasta</strong>
            <span>Pakeisk paiešką arba filtrus ir bandyk dar kartą.</span>
          </div>
        )}

        {!isLoading && !error && Boolean(itemsState?.items.length) && (
          <InventoryList items={itemsState?.items ?? []} />
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

function InventoryList({ items }: { items: Item[] }) {
  return (
    <div className="record-list">
      {items.map((item) => (
        <article className="record-row" key={item.id}>
          <div className="record-icon">I</div>
          <div className="record-main">
            <Link className="record-title" to={`/inventory/${item.id}`}>{item.name}</Link>
            <span>{item.description || item.condition}</span>
            <div className="record-chip-row">
              <span className="mini-chip">{item.category}</span>
              <span className="mini-chip">{itemTypeLabel(item.type)}</span>
              <span className="mini-chip">{item.custodianName ?? "Bendras tuntas"}</span>
            </div>
          </div>
          <div className="record-meta">
            <strong className={item.isLowStock ? "danger-text" : undefined}>{item.quantity} {item.unitOfMeasure ?? "vnt."}</strong>
            {item.minimumQuantity != null && <span>Min. {item.minimumQuantity}</span>}
            <span>{item.locationPath ?? item.locationName ?? item.temporaryStorageLabel ?? "Lokacija nenurodyta"}</span>
          </div>
          <StatusBadge status={item.status} />
        </article>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}
