import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, Edit3, PackagePlus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "../api/client";
import type { EventInventoryItem, EventInventoryPlan, EventInventoryReadiness, Item, Member, Pastovykle } from "../api/types";
import { SkautaiEmptyState, SkautaiErrorState, SkautaiStatusPill } from "../components/ui/Skautai";
import type { EventWorkspaceContext } from "./EventWorkspacePage";

export function EventPlanSection({ context }: { context: EventWorkspaceContext }) {
  const [plan, setPlan] = useState<EventInventoryPlan | null>(null);
  const [readiness, setReadiness] = useState<EventInventoryReadiness | null>(null);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pastovykles, setPastovykles] = useState<Pastovykle[]>([]);
  const [bucketName, setBucketName] = useState("");
  const [bucketType, setBucketType] = useState("OTHER");
  const [bucketPastovykleId, setBucketPastovykleId] = useState("");
  const [bucketNotes, setBucketNotes] = useState("");
  const [editingItem, setEditingItem] = useState<EventInventoryItem | null>(null);
  const [itemId, setItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("1");
  const [bucketId, setBucketId] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [allocationItemId, setAllocationItemId] = useState("");
  const [allocationBucketId, setAllocationBucketId] = useState("");
  const [allocationQuantity, setAllocationQuantity] = useState("1");
  const [sourcePlanItemId, setSourcePlanItemId] = useState("");
  const [sourceItemId, setSourceItemId] = useState("");
  const [sourceQuantity, setSourceQuantity] = useState("1");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [planResponse, readinessResponse, itemResponse, memberResponse, pastovykleResponse] = await Promise.all([
      api.getEventInventoryPlan(context.token, context.tuntasId, context.event.id),
      api.getEventInventoryReadiness(context.token, context.tuntasId, context.event.id).catch(() => null),
      api.listItems(context.token, context.tuntasId, { status: "ACTIVE", limit: 200, offset: 0 }).catch(() => ({ items: [], total: 0, offset: 0, hasMore: false })),
      api.listEventCandidateMembers(context.token, context.tuntasId, context.event.id).catch(() => ({ members: [], total: 0 })),
      context.event.type === "STOVYKLA"
        ? api.listEventPastovykles(context.token, context.tuntasId, context.event.id).catch(() => ({ pastovykles: [], total: 0 }))
        : Promise.resolve({ pastovykles: [], total: 0 })
    ]);
    setPlan(planResponse); setReadiness(readinessResponse); setInventory(itemResponse.items); setMembers(memberResponse.members); setPastovykles(pastovykleResponse.pastovykles);
  }, [context.event.id, context.event.type, context.token, context.tuntasId]);

  useEffect(() => { refresh().catch((cause) => setError(messageOf(cause, "Inventoriaus plano įkelti nepavyko."))); }, [refresh]);

  async function execute(action: string, success: string, operation: () => Promise<unknown>) {
    if (busy) return; setBusy(action); setError(null); setMessage(null);
    try { await operation(); await refresh(); await context.refreshEvent(); setMessage(success); }
    catch (cause) { setError(messageOf(cause, "Veiksmo atlikti nepavyko.")); }
    finally { setBusy(null); }
  }

  function createBucket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!bucketName.trim()) return;
    if (bucketType === "PASTOVYKLE" && !bucketPastovykleId) { setError("Pasirinkite pastovyklę."); return; }
    void execute("bucket", "Plano grupė sukurta.", () => api.createEventInventoryBucket(context.token, context.tuntasId, context.event.id, { name: bucketName.trim(), type: bucketType, pastovykleId: bucketType === "PASTOVYKLE" ? bucketPastovykleId : null, notes: optional(bucketNotes) })).then(() => { setBucketName(""); setBucketNotes(""); setBucketPastovykleId(""); });
  }

  function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = positiveInteger(plannedQuantity); const selectedItem = inventory.find((candidate) => candidate.id === itemId);
    if (!quantity || (!selectedItem && !itemName.trim() && !editingItem?.itemId)) { setError("Nurodykite daiktą arba pavadinimą ir tinkamą kiekį."); return; }
    const operation = editingItem
      ? () => api.updateEventInventoryItem(context.token, context.tuntasId, context.event.id, editingItem.id, {
        name: editingItem.itemId ? editingItem.name : itemName.trim(), plannedQuantity: quantity,
        bucketId: optional(bucketId), responsibleUserId: optional(responsibleUserId), notes: optional(itemNotes),
        clearBucketId: !bucketId, clearResponsibleUserId: !responsibleUserId, clearNotes: !itemNotes.trim()
      })
      : () => api.createEventInventoryItem(context.token, context.tuntasId, context.event.id, { itemId: selectedItem?.id ?? null, name: selectedItem?.name ?? itemName.trim(), plannedQuantity: quantity, bucketId: optional(bucketId), responsibleUserId: optional(responsibleUserId), notes: optional(itemNotes) });
    void execute("item", editingItem ? "Plano eilutė atnaujinta." : "Plano eilutė sukurta.", operation).then(resetItemForm);
  }

  function createAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const quantity = positiveInteger(allocationQuantity);
    if (!quantity || !allocationItemId || !allocationBucketId) { setError("Pasirinkite poreikį, grupę ir kiekį."); return; }
    void execute("allocation", "Inventorius paskirstytas plano grupei.", () => api.createEventInventoryAllocation(context.token, context.tuntasId, context.event.id, { eventInventoryItemId: allocationItemId, bucketId: allocationBucketId, quantity })).then(() => setAllocationQuantity("1"));
  }

  function createSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const quantity = positiveInteger(sourceQuantity);
    if (!quantity || !sourcePlanItemId || !sourceItemId) { setError("Pasirinkite plano eilutę, inventoriaus šaltinį ir kiekį."); return; }
    void execute("source", "Inventoriaus šaltinis pridėtas.", () => api.createEventInventorySource(context.token, context.tuntasId, context.event.id, sourcePlanItemId, { itemId: sourceItemId, plannedQuantity: quantity })).then(() => setSourceQuantity("1"));
  }

  function startEdit(item: EventInventoryItem) { setEditingItem(item); setItemId(item.itemId ?? ""); setItemName(item.itemId ? "" : item.name); setPlannedQuantity(String(item.plannedQuantity)); setBucketId(item.bucketId ?? ""); setResponsibleUserId(item.responsibleUserId ?? ""); setItemNotes(item.notes ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function resetItemForm() { setEditingItem(null); setItemId(""); setItemName(""); setPlannedQuantity("1"); setBucketId(""); setResponsibleUserId(""); setItemNotes(""); }

  const shortageItems = useMemo(() => plan?.items.filter((item) => item.shortageQuantity > 0) ?? [], [plan]);
  if (!plan) return error ? <SkautaiErrorState description={error} /> : <div className="table-state">Kraunamas inventoriaus planas...</div>;

  return <div className="event-workspace-stack">
    {error && <SkautaiErrorState description={error} />}{message && <p className="inline-success">{message}</p>}
    <section className="workspace-metrics"><Metric label="Parengtis" value={`${readiness?.readinessPercent ?? readinessPercent(plan)}%`} /><Metric label="Suplanuota" value={plan.items.reduce((sum, item) => sum + item.plannedQuantity, 0)} /><Metric label="Trūksta" value={plan.items.reduce((sum, item) => sum + item.shortageQuantity, 0)} danger={shortageItems.length > 0} /><Metric label="Grupės" value={plan.buckets.length} /></section>
    {readiness && readiness.conflicts.length > 0 && <section className="inline-alert"><AlertTriangle size={18} /><div><strong>{readiness.conflicts.length} prieinamumo konfliktai</strong><span>Inventorius persidengia su kitais renginiais; patikrinkite šaltinius.</span></div></section>}

    {context.canManageInventory && <div className="event-plan-form-grid">
      <form className={`form-panel event-workspace-form event-create-panel event-plan-item-form${editingItem ? " is-editing" : ""}`} onSubmit={saveItem}>
        <div className="form-section-heading"><PackagePlus /><div><h3>{editingItem ? "Redaguoti poreikį" : "Naujas poreikis"}</h3><span>Naudokite esamą inventorių arba laisvą pavadinimą pirkimui.</span></div></div>
        <div className="form-grid">
          <label className="form-field wide"><span>Esamas inventorius</span><select id="event-plan-item-source" value={itemId} disabled={Boolean(editingItem)} onChange={(event) => { setItemId(event.target.value); if (event.target.value) setItemName(""); }}><option value="">Nepririšti prie esamo įrašo</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.quantity} {item.unitOfMeasure ?? "vnt."}</option>)}</select>{editingItem && <small>Inventoriaus šaltinis redaguojant nekeičiamas; prireikus sukurkite naują poreikį.</small>}</label>
          {!itemId && <label className="form-field wide"><span>Pavadinimas *</span><input value={itemName} onChange={(event) => setItemName(event.target.value)} required /></label>}
          <label className="form-field"><span>Planuojamas kiekis *</span><input type="number" min="1" step="1" value={plannedQuantity} onChange={(event) => setPlannedQuantity(event.target.value)} required /></label>
          <label className="form-field"><span>Plano grupė</span><select value={bucketId} onChange={(event) => setBucketId(event.target.value)}><option value="">Bendra</option>{plan.buckets.map((bucket) => <option key={bucket.id} value={bucket.id}>{bucket.name}</option>)}</select></label>
          <label className="form-field"><span>Atsakingas</span><select value={responsibleUserId} onChange={(event) => setResponsibleUserId(event.target.value)}><option value="">Nepriskirtas</option>{members.map((member) => <option key={member.userId} value={member.userId}>{memberName(member)}</option>)}</select></label>
          <label className="form-field wide"><span>Pastabos</span><textarea rows={2} value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} /></label>
        </div>
        <div className="form-actions">{editingItem && <button className="secondary-button" type="button" onClick={resetItemForm}>Atšaukti</button>}<button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}>{editingItem ? "Išsaugoti" : "Pridėti poreikį"}</button></div>
      </form>
      <form className="form-panel event-workspace-form event-create-panel event-bucket-form" onSubmit={createBucket}>
        <div className="form-section-heading"><Boxes /><div><h3>Nauja plano grupė</h3><span>Skirstykite pagal pastovyklę arba inventoriaus paskirtį.</span></div></div>
        <div className="form-grid">
          <label className="form-field"><span>Pavadinimas *</span><input value={bucketName} onChange={(event) => setBucketName(event.target.value)} required /></label>
          <label className="form-field"><span>Tipas</span><select value={bucketType} onChange={(event) => { setBucketType(event.target.value); if (event.target.value !== "PASTOVYKLE") setBucketPastovykleId(""); }}><option value="OTHER">Kita</option><option value="PROGRAM">Programa</option><option value="KITCHEN">Virtuvė</option><option value="ADMIN">Administracija</option><option value="MEDICAL">Medicina</option>{context.event.type === "STOVYKLA" && <option value="PASTOVYKLE">Pastovyklė</option>}</select></label>
          {bucketType === "PASTOVYKLE" && <label className="form-field wide"><span>Pastovyklė *</span><select value={bucketPastovykleId} onChange={(event) => setBucketPastovykleId(event.target.value)} required><option value="">Pasirinkite</option>{pastovykles.map((pastovykle) => <option key={pastovykle.id} value={pastovykle.id}>{pastovykle.name}</option>)}</select></label>}
          <label className="form-field wide"><span>Pastabos</span><textarea rows={2} value={bucketNotes} onChange={(event) => setBucketNotes(event.target.value)} /></label>
        </div>
        <div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}><Plus size={17} />Sukurti grupę</button></div>
      </form>
    </div>}

    {context.canManageInventory && plan.items.length > 0 && <div className="event-plan-form-grid"><form className="form-panel event-workspace-form" onSubmit={createSource}><h3>Pridėti inventoriaus šaltinį</h3><div className="form-grid"><label className="form-field wide"><span>Plano poreikis *</span><select value={sourcePlanItemId} onChange={(event) => setSourcePlanItemId(event.target.value)} required><option value="">Pasirinkite</option>{plan.items.map((item) => <option key={item.id} value={item.id}>{item.name} · reikia {item.plannedQuantity}</option>)}</select></label><label className="form-field wide"><span>Inventoriaus įrašas *</span><select value={sourceItemId} onChange={(event) => setSourceItemId(event.target.value)} required><option value="">Pasirinkite</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} · likutis {item.quantity}</option>)}</select></label><label className="form-field"><span>Kiekis *</span><input type="number" min="1" value={sourceQuantity} onChange={(event) => setSourceQuantity(event.target.value)} /></label></div><div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}>Pridėti šaltinį</button></div></form>{plan.buckets.length > 0 && <form className="form-panel event-workspace-form" onSubmit={createAllocation}><h3>Paskirstyti grupei</h3><div className="form-grid"><label className="form-field wide"><span>Poreikis *</span><select value={allocationItemId} onChange={(event) => setAllocationItemId(event.target.value)} required><option value="">Pasirinkite</option>{plan.items.map((item) => <option key={item.id} value={item.id}>{item.name} · nepaskirstyta {item.unallocatedQuantity}</option>)}</select></label><label className="form-field wide"><span>Grupė *</span><select value={allocationBucketId} onChange={(event) => setAllocationBucketId(event.target.value)} required><option value="">Pasirinkite</option>{plan.buckets.map((bucket) => <option key={bucket.id} value={bucket.id}>{bucket.name}</option>)}</select></label><label className="form-field"><span>Kiekis *</span><input type="number" min="1" value={allocationQuantity} onChange={(event) => setAllocationQuantity(event.target.value)} /></label></div><div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}>Paskirstyti</button></div></form>}</div>}

    <section className="data-panel"><div className="data-panel-header"><span>Inventoriaus poreikiai</span><button className="icon-button" type="button" onClick={() => void refresh()} title="Atnaujinti"><RefreshCw size={16} /></button></div>{plan.items.length === 0 ? <SkautaiEmptyState icon={Boxes} title="Plano eilučių dar nėra" description="Pridėkite poreikius rankiniu būdu arba pritaikykite inventoriaus šabloną." /> : <div className="table-wrap"><table className="data-table compact-data-table"><thead><tr><th>Poreikis</th><th>Planuota</th><th>Prieinama</th><th>Paskirstyta</th><th>Trūksta</th><th>Šaltiniai</th><th /></tr></thead><tbody>{plan.items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><span>{item.bucketName ?? "Bendra"}{item.responsibleUserName ? ` · ${item.responsibleUserName}` : ""}</span></td><td>{item.plannedQuantity}</td><td>{item.availableQuantity}</td><td>{item.allocatedQuantity}</td><td><SkautaiStatusPill tone={item.shortageQuantity > 0 ? "danger" : "success"}>{item.shortageQuantity}</SkautaiStatusPill></td><td>{item.sources.length}<span>{item.sources.map((source) => source.pickupSummary ?? source.pickupCustodianName ?? source.sourceStatus).join(", ")}</span></td><td>{context.canManageInventory && <div className="row-actions"><button className="icon-button" type="button" onClick={() => startEdit(item)}><Edit3 size={16} /></button><button className="icon-button danger-icon-button" type="button" onClick={() => void execute(`delete-${item.id}`, "Plano eilutė pašalinta.", () => api.deleteEventInventoryItem(context.token, context.tuntasId, context.event.id, item.id))}><Trash2 size={16} /></button></div>}</td></tr>)}</tbody></table></div>}</section>
    {plan.allocations.length > 0 && <section className="detail-section"><h3>Paskirstymas</h3><div className="workspace-card-grid">{plan.allocations.map((allocation) => <article className="workspace-record-card" key={allocation.id}><span className="record-icon"><Boxes size={17} /></span><div><strong>{plan.items.find((item) => item.id === allocation.eventInventoryItemId)?.name ?? "Inventorius"}</strong><span>{allocation.bucketName} · {allocation.quantity} vnt.</span></div>{context.canManageInventory && <button className="icon-button danger-icon-button" type="button" onClick={() => void execute(`allocation-${allocation.id}`, "Paskirstymas pašalintas.", () => api.deleteEventInventoryAllocation(context.token, context.tuntasId, context.event.id, allocation.id))}><Trash2 size={16} /></button>}</article>)}</div></section>}
  </div>;
}

function Metric({ label, value, danger = false }: { label: string; value: number | string; danger?: boolean }) { return <article className={danger ? "is-danger" : undefined}><span>{label}</span><strong>{value}</strong></article>; }
function optional(value: string) { const trimmed = value.trim(); return trimmed ? trimmed : null; }
function positiveInteger(value: string) { const number = Number(value); return Number.isInteger(number) && number > 0 ? number : null; }
function readinessPercent(plan: EventInventoryPlan) { const total = plan.items.reduce((sum, item) => sum + item.plannedQuantity, 0); const ready = plan.items.reduce((sum, item) => sum + Math.min(item.plannedQuantity, item.availableQuantity), 0); return total ? Math.round(ready / total * 100) : 0; }
function memberName(member: Member) { return [member.name, member.surname].filter(Boolean).join(" ") || member.email; }
function messageOf(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
