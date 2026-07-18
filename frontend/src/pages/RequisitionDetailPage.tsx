import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarDays, ClipboardList, Loader2, PackagePlus, ShoppingCart, type LucideIcon } from "lucide-react";
import { api } from "../api/client";
import type { AddRequisitionItemToInventoryRequest, Item, OrganizationalUnit, Requisition, RequisitionItem } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { finiteCount, requisitionActionLabel, requestTypeLabel, reviewLevelLabel, reviewStatusLabel, statusLabel } from "../utils/display";
import { hasAnyPermission, hasPermission } from "../utils/permissions";

type InventoryAction = "NEW_ITEM" | "RESTOCK_EXISTING";

type InventoryDraft = {
  action: InventoryAction;
  existingItemId: string;
  custodianId: string;
  type: string;
  category: string;
  condition: string;
  purchaseDate: string;
  purchasePrice: string;
  notes: string;
};

export function RequisitionDetailPage() {
  const { requisitionId } = useParams();
  const { auth } = useAuth();
  const [request, setRequest] = useState<Requisition | null>(null);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, InventoryDraft>>({});
  const [unitReviewNotes, setUnitReviewNotes] = useState("");
  const [topLevelReviewNotes, setTopLevelReviewNotes] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshRequest = useCallback(async (showLoading: boolean) => {
    if (!requisitionId || !auth?.token || !auth.activeTuntasId) {
      setRequest(null);
      return false;
    }

    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const nextRequest = await api.getRequisition(auth.token, auth.activeTuntasId, requisitionId);
      setRequest(nextRequest);

      if (nextRequest.status === "PURCHASED" && hasPermission(auth.permissions, "items.create")) {
        const [itemsResponse, unitsResponse] = await Promise.all([
          api.listItems(auth.token, auth.activeTuntasId, { status: "ACTIVE", limit: 200, offset: 0 }).catch(() => null),
          api.listOrganizationalUnits(auth.token, auth.activeTuntasId).catch(() => null)
        ]);
        setInventoryItems(itemsResponse?.items ?? []);
        setUnits(unitsResponse?.units ?? []);
      } else {
        setInventoryItems([]);
        setUnits([]);
      }

      setInventoryDrafts((current) => buildInventoryDrafts(nextRequest, current));
      return true;
    } catch (cause) {
      setError(errorMessage(cause, "Nepavyko įkelti pirkimo prašymo."));
      if (showLoading) setRequest(null);
      return false;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [auth?.activeTuntasId, auth?.permissions, auth?.token, requisitionId]);

  useEffect(() => {
    void refreshRequest(true);
  }, [refreshRequest]);

  async function runAction(action: string, successMessage: string, operation: () => Promise<unknown>) {
    if (busyAction) return;
    setBusyAction(action);
    setError(null);
    setMessage(null);
    try {
      await operation();
      const refreshed = await refreshRequest(false);
      if (refreshed) setMessage(successMessage);
    } catch (cause) {
      setError(errorMessage(cause, "Veiksmo atlikti nepavyko."));
    } finally {
      setBusyAction(null);
    }
  }

  const isOwner = request?.createdByUserId === auth?.userId;
  const canUnitReview = Boolean(
    request?.requestingUnitId &&
    !isOwner &&
    request.unitReviewStatus === "PENDING" &&
    ((hasAnyPermission(auth?.permissions, ["items.request.approve.unit", "items.request.forward.bendras"]) &&
      (auth?.leadershipUnitIds.includes(request.requestingUnitId) ?? false)) ||
      hasPermission(auth?.permissions, "requisitions.approve"))
  );
  const canTopLevelReview = Boolean(!isOwner && request?.topLevelReviewStatus === "PENDING" && hasPermission(auth?.permissions, "requisitions.approve"));
  const canMarkPurchased = Boolean(request?.status === "APPROVED" && hasPermission(auth?.permissions, "requisitions.approve"));
  const canAddToInventory = Boolean(request?.status === "PURCHASED" && hasPermission(auth?.permissions, "items.create"));
  const canDelete = Boolean(isOwner && request && !["APPROVED", "REJECTED", "CANCELLED"].includes(request.status));
  const pendingInventoryItems = request?.items.filter((item) => item.itemId == null) ?? [];

  function review(level: "unit" | "top", action: "APPROVED" | "FORWARDED" | "REJECTED") {
    if (!requisitionId || !auth?.token || !auth.activeTuntasId) return;
    const notes = level === "unit" ? unitReviewNotes : topLevelReviewNotes;
    if (action === "REJECTED" && !window.confirm("Atmesti šį pirkimo prašymą?")) return;
    const operation = level === "unit"
      ? () => api.reviewRequisitionUnit(auth.token, auth.activeTuntasId!, requisitionId, { action, rejectionReason: action === "REJECTED" ? optional(notes) : null })
      : () => api.reviewRequisitionTopLevel(auth.token, auth.activeTuntasId!, requisitionId, { action, rejectionReason: action === "REJECTED" ? optional(notes) : null });
    const success = action === "APPROVED" ? "Prašymas patvirtintas." : action === "FORWARDED" ? "Prašymas perduotas tunto peržiūrai." : "Prašymas atmestas.";
    void runAction(`${level}-${action}`, success, operation);
  }

  function deleteRequest() {
    if (!requisitionId || !auth?.token || !auth.activeTuntasId) return;
    if (!window.confirm("Atšaukti šį pirkimo prašymą?")) return;
    void runAction("delete", "Pirkimo prašymas atšauktas.", () => api.deleteRequisition(auth.token, auth.activeTuntasId!, requisitionId));
  }

  function markPurchased(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requisitionId || !auth?.token || !auth.activeTuntasId) return;
    if (!window.confirm("Pažymėti visą prašymą kaip nupirktą?")) return;
    void runAction(
      "mark-purchased",
      "Prašymas pažymėtas kaip nupirktas.",
      () => api.markRequisitionPurchased(auth.token, auth.activeTuntasId!, requisitionId, { notes: optional(purchaseNotes) })
    ).then(() => setPurchaseNotes(""));
  }

  function updateDraft(itemId: string, values: Partial<InventoryDraft>) {
    setInventoryDrafts((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...values }
    }));
  }

  function addToInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || !requisitionId || !auth?.token || !auth.activeTuntasId) return;
    const actions: AddRequisitionItemToInventoryRequest[] = [];

    for (const item of pendingInventoryItems) {
      const draft = inventoryDrafts[item.id];
      if (!draft) continue;
      if (draft.action === "RESTOCK_EXISTING" && !draft.existingItemId) {
        setError(`Pasirink, kurį inventoriaus įrašą papildyti eilutei „${item.itemName}“.`);
        return;
      }
      if (draft.action === "NEW_ITEM" && !draft.category.trim()) {
        setError(`Nurodyk kategoriją eilutei „${item.itemName}“.`);
        return;
      }
      const purchasePrice = numberOrNull(draft.purchasePrice);
      if (draft.purchasePrice.trim() && purchasePrice == null) {
        setError(`Nurodyk tinkamą pirkimo kainą eilutei „${item.itemName}“.`);
        return;
      }
      actions.push({
        requisitionItemId: item.id,
        action: draft.action,
        existingItemId: draft.action === "RESTOCK_EXISTING" ? draft.existingItemId : null,
        custodianId: draft.action === "NEW_ITEM" ? optional(draft.custodianId) : null,
        type: draft.type,
        category: draft.category.trim() || "TOOLS",
        condition: draft.condition,
        purchaseDate: optional(draft.purchaseDate),
        purchasePrice,
        notes: optional(draft.notes)
      });
    }

    if (actions.length === 0) {
      setError("Nėra inventoriaus eilučių, kurias būtų galima pridėti.");
      return;
    }

    void runAction(
      "add-inventory",
      "Nupirktos eilutės pridėtos į inventorių.",
      () => api.addRequisitionToInventory(auth.token, auth.activeTuntasId!, requisitionId, { items: actions })
    );
  }

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/purchases"><ArrowLeft size={17} aria-hidden="true" />Grįžti į prašymus</Link>
          <h2>{request ? requestTitle(request) : "Pirkimo prašymas"}</h2>
        </div>
        {request && <StatusBadge status={request.status} />}
      </div>

      {isLoading && <div className="data-panel"><div className="table-state"><Loader2 className="spin" size={22} aria-hidden="true" />Kraunamas pirkimo prašymas...</div></div>}
      {error && <div className="inline-alert" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
      {message && <div className="inline-success" role="status"><span>{message}</span></div>}

      {!isLoading && request && (
        <>
          <div className="detail-grid">
            <article className="detail-main">
              <div className="detail-title-row">
                <div><span className="eyebrow">{request.requestingUnitName ?? "Tunto prašymas"}</span><h3>{requestTitle(request)}</h3></div>
                <div className="quantity-card"><strong>{totalQuantity(request)} vnt.</strong><span>{request.items.length} eil.</span></div>
              </div>
              {request.notes && <p className="detail-description">{request.notes}</p>}
              <div className="info-grid">
                <InfoTile icon={ShoppingCart} label="Būsena" value={statusLabel(request.status)} />
                <InfoTile icon={ClipboardList} label="Padalinys" value={reviewStatusLabel(request.unitReviewStatus)} />
                <InfoTile icon={ClipboardList} label="Tuntas" value={reviewStatusLabel(request.topLevelReviewStatus)} />
                <InfoTile icon={CalendarDays} label="Reikia iki" value={formatOptionalDate(request.neededByDate)} />
                <InfoTile icon={PackagePlus} label="Įsigyta" value={formatOptionalDate(request.purchasedAt)} />
                <InfoTile icon={PackagePlus} label="Pridėta" value={formatOptionalDate(request.addedToInventoryAt)} />
              </div>
              <section className="detail-section">
                <h3>Prašomos eilutės</h3>
                <div className="table-wrap"><table className="data-table compact-data-table"><thead><tr><th>Inventorius</th><th>Kiekis</th><th>Patvirtinta</th><th>Inventoriaus būsena</th><th>Pastabos</th></tr></thead><tbody>{request.items.map((item) => <tr key={item.id}><td><strong>{item.itemName}</strong><span>{item.itemDescription ?? requestTypeLabel(item.requestType)}</span></td><td>{finiteCount(item.quantityRequested)}</td><td>{item.quantityApproved != null ? finiteCount(item.quantityApproved) : "-"}</td><td>{item.itemId ? "Pridėta" : "Laukia"}</td><td>{item.rejectionReason ?? item.notes ?? "-"}</td></tr>)}</tbody></table></div>
              </section>
            </article>
            <aside className="detail-side">
              <DetailFact label="Peržiūros lygis" value={reviewLevelLabel(request.reviewLevel)} />
              <DetailFact label="Paskutinis veiksmas" value={requisitionActionLabel(request.lastAction)} />
              <DetailFact label="Sukurta" value={formatDateTime(request.createdAt)} />
              <DetailFact label="Atnaujinta" value={formatDateTime(request.updatedAt)} />
            </aside>
          </div>

          {(canUnitReview || canTopLevelReview || canDelete) && (
            <section className="form-section" aria-labelledby="requisition-actions-heading">
              <div className="form-section-heading"><ClipboardList aria-hidden="true" /><div><h3 id="requisition-actions-heading">Prašymo sprendimai</h3><span>Veiksmai rodomi pagal dabartinį peržiūros etapą.</span></div></div>
              {canUnitReview && (
                <form className="form-panel" onSubmit={(event) => { event.preventDefault(); review("unit", "APPROVED"); }}>
                  <div className="form-grid"><label className="form-field wide"><span>Padalinio pastabos / atmetimo priežastis</span><textarea rows={2} value={unitReviewNotes} onChange={(event) => setUnitReviewNotes(event.target.value)} disabled={Boolean(busyAction)} /></label></div>
                  <div className="form-actions"><button className="secondary-button" type="button" disabled={Boolean(busyAction)} onClick={() => review("unit", "REJECTED")}>Atmesti</button><button className="secondary-button" type="button" disabled={Boolean(busyAction)} onClick={() => review("unit", "FORWARDED")}>Perduoti tuntui</button><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busyAction)}>Patvirtinti padalinyje</button></div>
                </form>
              )}
              {canTopLevelReview && (
                <form className="form-panel" onSubmit={(event) => { event.preventDefault(); review("top", "APPROVED"); }}>
                  <div className="form-grid"><label className="form-field wide"><span>Tunto pastabos / atmetimo priežastis</span><textarea rows={2} value={topLevelReviewNotes} onChange={(event) => setTopLevelReviewNotes(event.target.value)} disabled={Boolean(busyAction)} /></label></div>
                  <div className="form-actions"><button className="secondary-button" type="button" disabled={Boolean(busyAction)} onClick={() => review("top", "REJECTED")}>Atmesti</button><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busyAction)}>Patvirtinti tunte</button></div>
                </form>
              )}
              {canDelete && <div className="form-actions"><button className="primary-button compact-primary-button tone-danger" type="button" disabled={Boolean(busyAction)} onClick={deleteRequest}>Atšaukti prašymą</button></div>}
            </section>
          )}

          {canMarkPurchased && (
            <form className="form-section" onSubmit={markPurchased}>
              <div className="form-section-heading"><ShoppingCart aria-hidden="true" /><div><h3>Pažymėti kaip nupirktą</h3><span>Po šio veiksmo kiekvieną eilutę galėsi pridėti kaip naują įrašą arba papildyti esamą.</span></div></div>
              <div className="form-grid"><label className="form-field wide"><span>Pirkimo pastabos (nebūtina)</span><textarea rows={2} value={purchaseNotes} onChange={(event) => setPurchaseNotes(event.target.value)} disabled={Boolean(busyAction)} /></label></div>
              <div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busyAction)}>Pažymėti kaip nupirktą</button></div>
            </form>
          )}

          {canAddToInventory && pendingInventoryItems.length > 0 && (
            <form className="form-panel" onSubmit={addToInventory}>
              <section className="form-section">
                <div className="form-section-heading"><PackagePlus aria-hidden="true" /><div><h3>Pridėti į inventorių</h3><span>Kiekvienai nupirktai eilutei pasirink naują įrašą arba esamo įrašo papildymą.</span></div></div>
              </section>
              {pendingInventoryItems.map((item) => {
                const draft = inventoryDrafts[item.id];
                if (!draft) return null;
                return (
                  <fieldset className="form-section" key={item.id} disabled={Boolean(busyAction)}>
                    <legend><strong>{item.itemName}</strong> — {item.quantityApproved ?? item.quantityRequested} vnt.</legend>
                    <div className="form-grid">
                      <label className="form-field wide"><span>Inventoriaus veiksmas</span><select value={draft.action} onChange={(event) => updateDraft(item.id, { action: event.target.value as InventoryAction })}><option value="NEW_ITEM">Sukurti naują įrašą</option><option value="RESTOCK_EXISTING">Papildyti esamą įrašą</option></select></label>
                      {draft.action === "RESTOCK_EXISTING" ? (
                        <label className="form-field wide"><span>Esamas inventoriaus įrašas</span><select value={draft.existingItemId} onChange={(event) => updateDraft(item.id, { existingItemId: event.target.value })} required><option value="">Pasirink įrašą</option>{draft.existingItemId && !inventoryItems.some((candidate) => candidate.id === draft.existingItemId) && <option value={draft.existingItemId}>Anksčiau pasirinktas įrašas ({draft.existingItemId})</option>}{inventoryItems.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} — {candidate.quantity} {candidate.unitOfMeasure ?? "vnt."}</option>)}</select></label>
                      ) : (
                        <>
                          <label className="form-field"><span>Saugotojas</span><select value={draft.custodianId} onChange={(event) => updateDraft(item.id, { custodianId: event.target.value })}><option value="">Bendras tunto inventorius</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
                          <label className="form-field"><span>Tipas</span><select value={draft.type} onChange={(event) => updateDraft(item.id, { type: event.target.value })}><option value="COLLECTIVE">Bendras</option><option value="ASSIGNED">Priskirtas</option></select></label>
                          <label className="form-field"><span>Kategorija</span><input value={draft.category} onChange={(event) => updateDraft(item.id, { category: event.target.value })} required /></label>
                          <label className="form-field"><span>Būklė</span><select value={draft.condition} onChange={(event) => updateDraft(item.id, { condition: event.target.value })}><option value="GOOD">Gera</option><option value="DAMAGED">Sugadinta</option><option value="REPAIR_NEEDED">Reikia remonto</option><option value="UNKNOWN">Nežinoma</option><option value="LOST">Prarasta</option></select></label>
                        </>
                      )}
                      <label className="form-field"><span>Pirkimo data</span><input type="date" value={draft.purchaseDate} onChange={(event) => updateDraft(item.id, { purchaseDate: event.target.value })} /></label>
                      <label className="form-field"><span>Pirkimo kaina</span><input type="number" min="0" step="0.01" value={draft.purchasePrice} onChange={(event) => updateDraft(item.id, { purchasePrice: event.target.value })} /></label>
                      <label className="form-field wide"><span>Pastabos</span><textarea rows={2} value={draft.notes} onChange={(event) => updateDraft(item.id, { notes: event.target.value })} /></label>
                    </div>
                  </fieldset>
                );
              })}
              <div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busyAction)}>Pridėti visas eilutes</button></div>
            </form>
          )}
        </>
      )}
    </section>
  );
}

function buildInventoryDrafts(request: Requisition, current: Record<string, InventoryDraft>) {
  return request.items.reduce<Record<string, InventoryDraft>>((drafts, item) => {
    if (item.itemId != null) return drafts;
    drafts[item.id] = current[item.id] ?? {
      action: item.requestType === "RESTOCK_EXISTING" ? "RESTOCK_EXISTING" : "NEW_ITEM",
      existingItemId: item.existingItemId ?? "",
      custodianId: request.requestingUnitId ?? "",
      type: "COLLECTIVE",
      category: "TOOLS",
      condition: "GOOD",
      purchaseDate: "",
      purchasePrice: "",
      notes: item.notes ?? ""
    };
    return drafts;
  }, {});
}

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="info-tile"><Icon size={19} aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>; }
function DetailFact({ label, value }: { label: string; value: string }) { return <div className="detail-fact"><span>{label}</span><strong>{value}</strong></div>; }
function StatusBadge({ status }: { status: string }) { return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabel(status)}</span>; }
function requestTitle(request: Requisition) { return request.items[0]?.itemName ?? "Pirkimo prašymas"; }
function totalQuantity(request: Requisition) { return request.items.reduce((sum, item) => sum + finiteCount(item.quantityRequested), 0); }
function optional(value: string) { const trimmed = value.trim(); return trimmed ? trimmed : null; }
function numberOrNull(value: string) { if (!value.trim()) return null; const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : null; }
function errorMessage(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
function formatOptionalDate(value?: string | null) { return value ? formatDate(value) : "-"; }
function formatDate(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "-"; return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date); }
function formatDateTime(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "-"; return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium", timeStyle: "short" }).format(date); }
