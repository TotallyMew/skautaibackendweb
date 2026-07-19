import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Loader2, PackageCheck, PackageSearch, Plus, QrCode, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Item, ItemListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  SkautaiDataTable,
  SkautaiEmptyState,
  SkautaiErrorState,
  SkautaiPageShell,
  SkautaiSearchBar,
  SkautaiStatusPill,
  SkautaiTableFooter,
  SkautaiToolbar,
  type SkautaiDataTableColumn
} from "../components/ui/Skautai";
import { countLabel, finiteCount, itemCategoryLabel, itemConditionLabel, itemTypeLabel, statusLabel } from "../utils/display";

const pageSize = 25;
const statusOptions = [
  { value: "", label: "Visos būsenos" },
  { value: "ACTIVE", label: "Aktyvūs" },
  { value: "PENDING_APPROVAL", label: "Laukia tvirtinimo" },
  { value: "INACTIVE", label: "Neaktyvūs" }
];
const typeOptions = [
  { value: "", label: "Visi tipai" },
  { value: "COLLECTIVE", label: "Bendras" },
  { value: "ASSIGNED", label: "Priskirtas" },
  { value: "INDIVIDUAL", label: "Asmeninis" }
];

export function InventoryPage() {
  const { auth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [itemsState, setItemsState] = useState<ItemListResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [sharedOnly, setSharedOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canFetch = Boolean(auth?.token && auth.activeTuntasId);
  const responsibleUserId = searchParams.get("responsibleUserId")?.trim() ?? "";
  const canCreate = itemsState?.capabilities.canCreate === true;
  const visibleStatusOptions = statusOptions.filter((option) =>
    option.value !== "INACTIVE" || itemsState?.capabilities.canViewInactive === true
  ).filter((option) =>
    option.value !== "PENDING_APPROVAL" || itemsState?.capabilities.canViewPending === true
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setOffset(0);
      setQuery(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) {
      setItemsState(null);
      return;
    }
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    api.listItems(auth.token, auth.activeTuntasId, {
      q: query, status, type, category, sharedOnly, responsibleUserId: responsibleUserId || undefined, limit: pageSize, offset
    }).then((response) => {
      if (!isCancelled) setItemsState(response);
    }).catch(() => {
      if (!isCancelled) {
        setError("Nepavyko užkrauti inventoriaus.");
        setItemsState(null);
      }
    }).finally(() => {
      if (!isCancelled) setIsLoading(false);
    });
    return () => { isCancelled = true; };
  }, [auth?.activeTuntasId, auth?.token, category, offset, query, reloadKey, responsibleUserId, sharedOnly, status, type]);

  function resetFilters() {
    setSearchInput("");
    setQuery("");
    setStatus("");
    setType("");
    setCategory("");
    setSharedOnly(false);
    setOffset(0);
    if (responsibleUserId) {
      const next = new URLSearchParams(searchParams);
      next.delete("responsibleUserId");
      setSearchParams(next, { replace: true });
    }
  }

  const total = finiteCount(itemsState?.total);
  const currentPage = Math.floor(offset / pageSize) + 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const actions = <>
    <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={!canFetch || isLoading}>
      <RefreshCw size={17} aria-hidden="true" />Atnaujinti
    </button>
    <Link className="secondary-button" to="/inventory/scan"><QrCode size={17} aria-hidden="true" />Skenuoti QR</Link>
    {canCreate && <Link className="primary-button compact-primary-button" to="/inventory/new"><Plus size={17} aria-hidden="true" />Naujas įrašas</Link>}
  </>;

  return (
    <SkautaiPageShell className="inventory-page" eyebrow="Inventorius" title="Inventoriaus įrašai"
      description="Peržiūrėkite kiekius, saugojimo vietas, būklę ir atsakingus vienetus vienoje lentelėje."
      actions={actions} width="wide">
      {responsibleUserId && <div className="active-filter-banner"><PackageSearch size={18} aria-hidden="true" /><span>Rodomas pasirinktam nariui priskirtas inventorius.</span><button type="button" onClick={resetFilters}>Rodyti visą inventorių</button></div>}
      <SkautaiToolbar title="Paieška ir filtrai">
        <div className="filter-bar management-filter-bar inventory-filter-bar">
          <SkautaiSearchBar value={searchInput} placeholder="Ieškoti pagal pavadinimą, kategoriją ar būklę..." onChange={setSearchInput} />
          <select value={status} aria-label="Būsena" onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>
            {visibleStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={type} aria-label="Tipas" onChange={(event) => { setType(event.target.value); setOffset(0); }}>
            {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input className="compact-input" aria-label="Kategorija" placeholder="Kategorija" value={category}
            onChange={(event) => { setCategory(event.target.value); setOffset(0); }} />
          <label className="toggle-field"><input type="checkbox" checked={sharedOnly}
            onChange={(event) => { setSharedOnly(event.target.checked); setOffset(0); }} />Tik bendras</label>
          <button className="filter-clear-button" type="button" onClick={resetFilters}>Valyti</button>
        </div>
      </SkautaiToolbar>

      {error && <SkautaiErrorState description={error} />}
      <div className="data-panel">
        {isLoading && <div className="table-state"><Loader2 className="spin" size={22} aria-hidden="true" />Kraunamas inventorius...</div>}
        {!isLoading && !error && itemsState?.items.length === 0 && <SkautaiEmptyState icon={PackageSearch}
          title="Inventoriaus pagal šiuos filtrus nerasta" description="Pakeiskite paiešką arba filtrus ir bandykite dar kartą." />}
        {!isLoading && !error && Boolean(itemsState?.items.length) && <InventoryTable items={itemsState?.items ?? []} />}
        {!error && total > 0 && <InventoryFooter total={total} currentPage={currentPage} pageCount={pageCount} offset={offset}
          hasMore={Boolean(itemsState?.hasMore)} isLoading={isLoading} onOffsetChange={setOffset} />}
      </div>
    </SkautaiPageShell>
  );
}

function InventoryTable({ items }: { items: Item[] }) {
  const columns: Array<SkautaiDataTableColumn<Item>> = [
    {
      key: "item", header: "Inventorius", cell: (item) => (
        <div className="table-title-cell">
          <span className="record-icon table-cell-icon"><PackageCheck size={18} aria-hidden="true" /></span>
          <div><Link className="table-link" to={`/inventory/${item.id}`}>{item.name}</Link>{item.description && <span>{item.description}</span>}</div>
        </div>
      )
    },
    { key: "category", header: "Kategorija", cell: (item) => <><strong>{itemCategoryLabel(item.category)}</strong><span>{itemTypeLabel(item.type)}</span></> },
    {
      key: "quantity", header: "Kiekis", cell: (item) => <>
        <strong className={item.isLowStock ? "danger-text" : undefined}>{finiteCount(item.quantity)} {item.unitOfMeasure ?? "vnt."}</strong>
        {item.minimumQuantity != null && <span>Min. {finiteCount(item.minimumQuantity)}</span>}
      </>
    },
    { key: "location", header: "Lokacija", cell: (item) => item.locationPath ?? item.locationName ?? item.temporaryStorageLabel ?? "—" },
    { key: "custody", header: "Saugotojas", className: "mobile-secondary-column", cell: (item) => item.custodianName ?? "Bendras tuntas" },
    { key: "condition", header: "Būklė", cell: (item) => itemConditionLabel(item.condition) },
    { key: "status", header: "Būsena", cell: (item) => <SkautaiStatusPill status={item.status}>{statusLabel(item.status)}</SkautaiStatusPill> },
    { key: "updated", header: "Atnaujinta", className: "mobile-secondary-column", cell: (item) => formatDate(item.updatedAt) },
    {
      key: "actions", header: "Veiksmai", className: "table-actions-cell", cell: (item) => (
        <Link className="icon-button" to={`/inventory/${item.id}`} aria-label={`Peržiūrėti ${item.name}`} title="Peržiūrėti">
          <Eye size={17} aria-hidden="true" />
        </Link>
      )
    }
  ];
  return <SkautaiDataTable rows={items} columns={columns} getRowKey={(item) => item.id} className="management-data-table inventory-data-table" />;
}

function InventoryFooter({ total, currentPage, pageCount, offset, hasMore, isLoading, onOffsetChange }: {
  total: number; currentPage: number; pageCount: number; offset: number; hasMore: boolean; isLoading: boolean; onOffsetChange: (offset: number) => void;
}) {
  return <SkautaiTableFooter meta={`${total} ${countLabel(total, "įrašas", "įrašai", "įrašų")} · Puslapis ${currentPage} iš ${pageCount}`}>
    <button className="icon-button" type="button" disabled={offset === 0 || isLoading}
      onClick={() => onOffsetChange(Math.max(0, offset - pageSize))} aria-label="Ankstesnis puslapis" title="Ankstesnis puslapis">
      <ChevronLeft size={18} aria-hidden="true" />
    </button>
    <button className="icon-button" type="button" disabled={!hasMore || isLoading}
      onClick={() => onOffsetChange(offset + pageSize)} aria-label="Kitas puslapis" title="Kitas puslapis">
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  </SkautaiTableFooter>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date);
}
