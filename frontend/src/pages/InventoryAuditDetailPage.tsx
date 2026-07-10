import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Save } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { Item, ItemCheck, ItemCheckSession, Location, UpsertStorageAuditCheckRequest } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  SkautaiConfirmDialog,
  SkautaiEmptyState,
  SkautaiErrorState,
  SkautaiPageShell,
  SkautaiStatusPill
} from "../components/ui/Skautai";
import { hasPermission } from "../utils/permissions";

type AuditScopeItem = {
  id: string;
  name: string;
  quantity: number;
  unitOfMeasure: string;
  condition: string;
  locationId: string;
  locationLabel: string;
};

type AuditDraft = {
  result: string;
  actualQuantity: string;
  actualLocationId: string;
  actualLocationNote: string;
  conditionAtCheck: string;
  notes: string;
  isDirty: boolean;
};

const resultOptions = [
  { value: "FOUND", label: "Rasta" },
  { value: "MISSING", label: "Trūksta" },
  { value: "MISPLACED", label: "Ne vietoje" },
  { value: "DAMAGED", label: "Pažeista" }
];

const conditionOptions = [
  { value: "GOOD", label: "Gera" },
  { value: "NEEDS_INSPECTION", label: "Reikia patikros" },
  { value: "UNDER_REPAIR", label: "Taisoma" },
  { value: "DAMAGED", label: "Pažeista" },
  { value: "MISSING", label: "Dingusi" },
  { value: "WRITTEN_OFF", label: "Nurašyta" }
];

export function InventoryAuditDetailPage() {
  const { sessionId } = useParams();
  const { auth } = useAuth();
  const [session, setSession] = useState<ItemCheckSession | null>(null);
  const [scopeItems, setScopeItems] = useState<AuditScopeItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AuditDraft>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);

  const canView = hasPermission(auth?.permissions, "items.view");

  useEffect(() => {
    if (!sessionId || !auth?.token || !auth.activeTuntasId || !canView) {
      setSession(null);
      setScopeItems([]);
      setDrafts({});
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setReferenceWarning(null);

    void (async () => {
      try {
        const [loadedSession, loadedLocations] = await Promise.all([
          api.getInventoryAuditSession(auth.token, auth.activeTuntasId, sessionId),
          api.listLocations(auth.token, auth.activeTuntasId).then((response) => response.locations).catch(() => [])
        ]);

        let loadedScopeItems: AuditScopeItem[];
        let warning: string | null = null;
        try {
          const inventoryItems = await fetchScopedItems(auth.token, auth.activeTuntasId, loadedSession);
          loadedScopeItems = mergeScopeItems(inventoryItems.map(toScopeItem), loadedSession.checks);
          if (loadedScopeItems.length < loadedSession.summary.total) {
            warning = `Inventorizacijos apimtyje užfiksuota ${loadedSession.summary.total} įrašų, bet dabar galima parodyti ${loadedScopeItems.length}. Prieš užbaigdami patikrinkite, ar inventorius nebuvo išaktyvintas arba ar nepasikeitė prieigos teisės.`;
          }
        } catch {
          loadedScopeItems = scopeItemsFromChecks(loadedSession.checks);
          warning = "Nepavyko įkelti visos dabartinės inventoriaus apimties. Rodomi tik jau išsaugoti patikrinimai; atnaujinkite puslapį arba patikrinkite prieigos teises.";
        }

        if (isCancelled) return;
        setSession(loadedSession);
        setLocations(loadedLocations);
        setScopeItems(loadedScopeItems);
        setDrafts(buildDrafts(loadedScopeItems, loadedSession.checks));
        setReferenceWarning(warning);
      } catch (cause) {
        if (!isCancelled) {
          setError(errorMessage(cause, "Inventorizacijos įkelti nepavyko."));
          setSession(null);
          setScopeItems([]);
          setDrafts({});
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, canView, reloadKey, sessionId]);

  const sortedLocations = useMemo(
    () => [...locations].sort((left, right) => left.fullPath.localeCompare(right.fullPath, "lt")),
    [locations]
  );
  const existingCheckIds = useMemo(
    () => new Set((session?.checks ?? []).map((check) => check.itemId).filter((itemId): itemId is string => Boolean(itemId))),
    [session?.checks]
  );
  const dirtyDrafts = useMemo(
    () => Object.entries(drafts).filter(([, draft]) => draft.isDirty && draft.result),
    [drafts]
  );
  const locallyEvaluatedCount = useMemo(
    () => Object.values(drafts).filter((draft) => draft.result).length,
    [drafts]
  );
  const hasUnsavedChanges = Object.values(drafts).some((draft) => draft.isDirty);
  const isOpen = session?.status === "OPEN";
  const canComplete = Boolean(isOpen && session?.summary.unchecked === 0 && !hasUnsavedChanges && !isSaving);

  function updateDraft(item: AuditScopeItem, patch: Partial<AuditDraft>) {
    setDrafts((current) => {
      const previous = current[item.id] ?? initialDraft(item);
      const next = { ...previous, ...patch };
      if (patch.result === "MISSING") {
        next.actualQuantity = "0";
      } else if (patch.result && (previous.result === "" || previous.result === "MISSING")) {
        next.actualQuantity = String(item.quantity);
      }
      if (patch.result === "DAMAGED") {
        next.conditionAtCheck = "DAMAGED";
      }
      next.isDirty = existingCheckIds.has(item.id) || Boolean(next.result);
      return { ...current, [item.id]: next };
    });
    setMessage(null);
  }

  async function saveChecks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionId || !auth?.token || !auth.activeTuntasId || !isOpen) return;
    if (dirtyDrafts.length === 0) {
      setMessage("Nėra naujų patikrinimo pakeitimų, kuriuos reikėtų išsaugoti.");
      return;
    }

    const checks: UpsertStorageAuditCheckRequest[] = [];
    for (const [itemId, draft] of dirtyDrafts) {
      const actualQuantity = Number(draft.actualQuantity);
      if (!Number.isInteger(actualQuantity) || actualQuantity < 0) {
        const item = scopeItems.find((entry) => entry.id === itemId);
        return setError(`Nurodykite tinkamą faktinį kiekį${item ? ` įrašui „${item.name}“` : ""}.`);
      }
      checks.push({
        itemId,
        result: draft.result,
        actualQuantity,
        actualLocationId: optional(draft.actualLocationId),
        actualLocationNote: optional(draft.actualLocationNote),
        conditionAtCheck: optional(draft.conditionAtCheck),
        notes: optional(draft.notes)
      });
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await api.upsertInventoryAuditChecks(auth.token, auth.activeTuntasId, sessionId, { checks });
      setSession(saved);
      setDrafts(buildDrafts(scopeItems, saved.checks));
      setMessage(`Išsaugota ${checks.length} ${checks.length === 1 ? "patikrinimo eilutė" : "patikrinimo eilutės"}.`);
    } catch (cause) {
      setError(errorMessage(cause, "Patikrinimų išsaugoti nepavyko."));
    } finally {
      setIsSaving(false);
    }
  }

  async function completeSession() {
    if (!sessionId || !auth?.token || !auth.activeTuntasId || !canComplete) return;
    setIsCompleting(true);
    setError(null);
    setMessage(null);
    try {
      const completed = await api.completeInventoryAuditSession(auth.token, auth.activeTuntasId, sessionId);
      setSession(completed);
      setDrafts(buildDrafts(scopeItems, completed.checks));
      setMessage("Inventorizacija užbaigta, o jos rezultatai pritaikyti inventoriui.");
      setIsCompleteDialogOpen(false);
    } catch (cause) {
      setError(errorMessage(cause, "Inventorizacijos užbaigti nepavyko."));
    } finally {
      setIsCompleting(false);
    }
  }

  const actions = (
    <>
      {session && (
        <SkautaiStatusPill status={session.status} tone={session.status === "OPEN" ? "warning" : "success"}>
          {session.status === "OPEN" ? "Vykdoma" : "Užbaigta"}
        </SkautaiStatusPill>
      )}
      <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading || !canView}>
        <RefreshCw size={17} aria-hidden="true" />
        Atnaujinti
      </button>
    </>
  );

  return (
    <SkautaiPageShell className="inventory-page" eyebrow="Inventorius" title="Inventorizacijos ataskaita" actions={actions}>
      <Link className="back-link" to="/inventory/audits">
        <ArrowLeft size={17} aria-hidden="true" />
        Grįžti į inventorizacijas
      </Link>

      {message && <p className="inline-success">{message}</p>}
      {error && <SkautaiErrorState description={error} />}
      {referenceWarning && <SkautaiErrorState title="Apimties duomenys pasikeitė" description={referenceWarning} />}

      {!canView ? (
        <SkautaiEmptyState
          icon={ClipboardCheck}
          title="Inventorizacija nepasiekiama"
          description="Inventorizacijai peržiūrėti reikia inventoriaus peržiūros teisės."
        />
      ) : isLoading && !session ? (
        <div className="data-panel">
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunama inventorizacija...
          </div>
        </div>
      ) : session ? (
        <>
          <section className="unit-summary-grid" aria-label="Inventorizacijos suvestinė">
            <MetricTile label="Apimtyje" value={session.summary.total} />
            <MetricTile label="Patikrinta" value={session.summary.checked} />
            <MetricTile label="Liko" value={session.summary.unchecked} />
            <MetricTile label="Trūksta" value={session.summary.missing} />
            <MetricTile label="Ne vietoje" value={session.summary.misplaced} />
            <MetricTile label="Pažeista" value={session.summary.damaged} />
          </section>

          <div className="inner-page-grid">
            <section className="data-panel">
              <div className="data-panel-header">
                <span>{sessionScopeLabel(session)}</span>
                <span>{session.scopeType ? itemTypeLabel(session.scopeType) : "Visi tipai"}{session.scopeCategory ? ` · ${session.scopeCategory}` : ""}</span>
              </div>
              <div className="side-stat-list" style={{ padding: "14px 16px" }}>
                <div><span>Pradėjo</span><strong>{session.startedByUserName ?? "Nenurodyta"}</strong></div>
                <div><span>Pradėta</span><strong>{formatDateTime(session.createdAt)}</strong></div>
                {session.completedAt && <div><span>Užbaigta</span><strong>{formatDateTime(session.completedAt)}</strong></div>}
                {session.notes && <div><span>Pastabos</span><strong>{session.notes}</strong></div>}
              </div>
            </section>

            <aside className="side-panel">
              <div className="side-panel-heading">
                <ClipboardCheck size={19} aria-hidden="true" />
                <h3>Kiekių rezultatai</h3>
              </div>
              <div className="side-stat-list">
                <div><span>Tikėtasi</span><strong>{session.summary.expectedQuantityTotal}</strong></div>
                <div><span>Faktiškai</span><strong>{session.summary.actualQuantityTotal}</strong></div>
                <div><span>Trūkumas</span><strong>{session.summary.shortageQuantityTotal}</strong></div>
                <div><span>Perteklius</span><strong>{session.summary.overageQuantityTotal}</strong></div>
              </div>
            </aside>
          </div>

          <form onSubmit={saveChecks}>
            <fieldset disabled={!isOpen || isSaving || isCompleting}>
              <section className="data-panel">
                <div className="data-panel-header">
                  <span>{scopeItems.length} rodomi įrašai · {locallyEvaluatedCount} įvertinta formoje</span>
                  <span>{hasUnsavedChanges ? "Yra neišsaugotų pakeitimų" : "Visi pakeitimai išsaugoti"}</span>
                </div>

                {scopeItems.length === 0 ? (
                  <SkautaiEmptyState
                    compact
                    icon={ClipboardCheck}
                    title="Inventorizacijos apimtis tuščia"
                    description="Šioje apimtyje nėra matomų aktyvių inventoriaus įrašų."
                  />
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <caption>Inventoriaus patikrinimo rezultatai</caption>
                      <thead>
                        <tr>
                          <th>Inventorius</th>
                          <th>Rezultatas</th>
                          <th>Faktinis kiekis</th>
                          <th>Faktinė vieta</th>
                          <th>Būklė</th>
                          <th>Pastabos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scopeItems.map((item) => {
                          const draft = drafts[item.id] ?? initialDraft(item);
                          const existingCheck = session.checks.find((check) => check.itemId === item.id);
                          return (
                            <tr key={item.id}>
                              <td>
                                <strong>{item.name}</strong>
                                <span>Tikėtasi: {item.quantity} {item.unitOfMeasure}</span>
                                <span>{item.locationLabel}</span>
                              </td>
                              <td>
                                <select
                                  aria-label={`${item.name}: patikrinimo rezultatas`}
                                  value={draft.result}
                                  onChange={(event) => updateDraft(item, { result: event.target.value })}
                                  required={Boolean(draft.isDirty)}
                                >
                                  <option value="" disabled={Boolean(existingCheck)}>Nepatikrinta</option>
                                  {resultOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                              </td>
                              <td>
                                <input
                                  aria-label={`${item.name}: faktinis kiekis`}
                                  type="number"
                                  min="0"
                                  value={draft.actualQuantity}
                                  onChange={(event) => updateDraft(item, { actualQuantity: event.target.value })}
                                  disabled={!draft.result}
                                />
                              </td>
                              <td>
                                <select
                                  aria-label={`${item.name}: faktinė lokacija`}
                                  value={draft.actualLocationId}
                                  onChange={(event) => updateDraft(item, { actualLocationId: event.target.value })}
                                  disabled={!draft.result}
                                >
                                  <option value="">Lokacija nepasirinkta</option>
                                  {sortedLocations.filter((location) => location.isLeafSelectable).map((location) => (
                                    <option key={location.id} value={location.id}>{location.fullPath}</option>
                                  ))}
                                  {draft.actualLocationId && !locations.some((location) => location.id === draft.actualLocationId) && (
                                    <option value={draft.actualLocationId}>{existingCheck?.actualLocationPath ?? "Anksčiau pasirinkta lokacija"}</option>
                                  )}
                                </select>
                                <input
                                  aria-label={`${item.name}: faktinės vietos paaiškinimas`}
                                  value={draft.actualLocationNote}
                                  onChange={(event) => updateDraft(item, { actualLocationNote: event.target.value })}
                                  placeholder="Lentyna ar vietos pastaba"
                                  disabled={!draft.result}
                                />
                              </td>
                              <td>
                                <select
                                  aria-label={`${item.name}: būklė patikrinimo metu`}
                                  value={draft.conditionAtCheck}
                                  onChange={(event) => updateDraft(item, { conditionAtCheck: event.target.value })}
                                  disabled={!draft.result}
                                >
                                  <option value="">Nenurodyta</option>
                                  {conditionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                              </td>
                              <td>
                                <textarea
                                  aria-label={`${item.name}: patikrinimo pastabos`}
                                  rows={2}
                                  value={draft.notes}
                                  onChange={(event) => updateDraft(item, { notes: event.target.value })}
                                  placeholder="Pažeidimas, trūkumas ar kitos pastabos"
                                  disabled={!draft.result}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {isOpen && (
                <div className="form-actions">
                  <button className="secondary-button" type="submit" disabled={isSaving || dirtyDrafts.length === 0}>
                    <Save size={17} aria-hidden="true" />
                    {isSaving ? "Saugoma..." : `Išsaugoti pakeitimus${dirtyDrafts.length ? ` (${dirtyDrafts.length})` : ""}`}
                  </button>
                  <button className="primary-button compact-primary-button" type="button" disabled={!canComplete} onClick={() => setIsCompleteDialogOpen(true)}>
                    <CheckCircle2 size={17} aria-hidden="true" />
                    Užbaigti inventorizaciją
                  </button>
                </div>
              )}
            </fieldset>
          </form>

          {isOpen && session.summary.unchecked > 0 && (
            <p className="error-text">Inventorizaciją bus galima užbaigti, kai išsaugosite visų {session.summary.total} apimties įrašų rezultatus. Liko: {session.summary.unchecked}.</p>
          )}
          {isOpen && session.summary.unchecked === 0 && hasUnsavedChanges && (
            <p className="error-text">Prieš užbaigdami inventorizaciją išsaugokite naujausius pakeitimus.</p>
          )}
        </>
      ) : null}

      <SkautaiConfirmDialog
        open={isCompleteDialogOpen}
        title="Užbaigti inventorizaciją?"
        description={session ? `Bus pritaikyti ${session.summary.checked} patikrinimų rezultatai: faktiniai kiekiai, lokacijos ir būklės. Šio veiksmo inventorizacijos formoje atšaukti negalima.` : undefined}
        confirmLabel="Užbaigti"
        tone="warning"
        isBusy={isCompleting}
        onCancel={() => setIsCompleteDialogOpen(false)}
        onConfirm={() => void completeSession()}
      />
    </SkautaiPageShell>
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

function buildDrafts(items: AuditScopeItem[], checks: ItemCheck[]) {
  const checksByItemId = new Map(checks.filter((check) => check.itemId).map((check) => [check.itemId as string, check]));
  return items.reduce<Record<string, AuditDraft>>((result, item) => {
    const check = checksByItemId.get(item.id);
    result[item.id] = check ? {
      result: check.result,
      actualQuantity: String(check.actualQuantity),
      actualLocationId: check.actualLocationId ?? "",
      actualLocationNote: check.actualLocationNote ?? "",
      conditionAtCheck: check.conditionAtCheck ?? item.condition,
      notes: check.notes ?? "",
      isDirty: false
    } : initialDraft(item);
    return result;
  }, {});
}

function initialDraft(item: AuditScopeItem): AuditDraft {
  return {
    result: "",
    actualQuantity: String(item.quantity),
    actualLocationId: item.locationId,
    actualLocationNote: "",
    conditionAtCheck: item.condition,
    notes: "",
    isDirty: false
  };
}

async function fetchScopedItems(token: string, tuntasId: string, session: ItemCheckSession) {
  const pageSize = 200;
  const result: Item[] = [];
  let offset = 0;

  for (let page = 0; page < 50; page += 1) {
    const response = await api.listItems(token, tuntasId, {
      status: "ACTIVE",
      type: session.scopeType ?? undefined,
      category: session.scopeCategory ?? undefined,
      sharedOnly: session.scopeSharedOnly || undefined,
      personalOwnerUserId: session.scopePersonalOwnerUserId ?? undefined,
      limit: pageSize,
      offset
    });
    result.push(...response.items);
    if (!response.hasMore || response.items.length === 0) break;
    offset += response.items.length;
  }

  return result.filter((item) => {
    if (session.scopeCustodianId && item.custodianId !== session.scopeCustodianId) return false;
    if (session.scopeSharedOnly && item.custodianId) return false;
    if (session.scopeType && item.type !== session.scopeType) return false;
    if (session.scopeCategory && item.category !== session.scopeCategory) return false;
    if (session.scopePersonalOwnerUserId && item.createdByUserId !== session.scopePersonalOwnerUserId) return false;
    return item.status === "ACTIVE";
  });
}

function toScopeItem(item: Item): AuditScopeItem {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unitOfMeasure: item.unitOfMeasure ?? "vnt.",
    condition: item.condition,
    locationId: item.locationId ?? "",
    locationLabel: item.locationPath ?? item.locationName ?? item.temporaryStorageLabel ?? "Vieta nenurodyta"
  };
}

function mergeScopeItems(items: AuditScopeItem[], checks: ItemCheck[]) {
  const result = [...items];
  const itemIds = new Set(result.map((item) => item.id));
  checks.forEach((check) => {
    if (!check.itemId || itemIds.has(check.itemId)) return;
    result.push(scopeItemFromCheck(check));
    itemIds.add(check.itemId);
  });
  return result.sort((left, right) => left.name.localeCompare(right.name, "lt"));
}

function scopeItemsFromChecks(checks: ItemCheck[]) {
  return checks
    .filter((check): check is ItemCheck & { itemId: string } => Boolean(check.itemId))
    .map(scopeItemFromCheck)
    .sort((left, right) => left.name.localeCompare(right.name, "lt"));
}

function scopeItemFromCheck(check: ItemCheck & { itemId?: string | null }): AuditScopeItem {
  return {
    id: check.itemId as string,
    name: check.itemName ?? "Inventoriaus įrašas",
    quantity: check.expectedQuantity,
    unitOfMeasure: "vnt.",
    condition: check.conditionAtCheck ?? "GOOD",
    locationId: check.actualLocationId ?? "",
    locationLabel: check.actualLocationPath ?? check.actualLocationNote ?? "Vieta nenurodyta"
  };
}

function sessionScopeLabel(session: ItemCheckSession) {
  if (session.scopeCustodianName) return session.scopeCustodianName;
  if (session.scopeSharedOnly) return "Bendras tunto inventorius";
  if (session.scopePersonalOwnerUserId) return "Asmeninis inventorius";
  return "Visas matomas inventorius";
}

function itemTypeLabel(value: string) {
  const labels: Record<string, string> = {
    COLLECTIVE: "Bendras",
    ASSIGNED: "Priskirtas",
    INDIVIDUAL: "Asmeninis"
  };
  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof ApiError || cause instanceof Error ? cause.message : fallback;
}
