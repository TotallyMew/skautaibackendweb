import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Edit3, Plus, RefreshCw, ShieldCheck, TentTree, Trash2, UsersRound } from "lucide-react";
import { api } from "../api/client";
import type { InventoryTemplate, Member, Pastovykle } from "../api/types";
import { SkautaiEmptyState, SkautaiErrorState, SkautaiStatusPill } from "../components/ui/Skautai";
import { eventTypeLabel, roleLabel, statusLabel } from "../utils/display";
import type { EventWorkspaceContext } from "./EventWorkspacePage";

const eventRoles = [
  ["VIRSININKAS", "Renginio viršininkas"],
  ["UKVEDYS", "Ūkvedys"],
  ["KOMENDANTAS", "Komendantas"],
  ["MAISTININKAS", "Maistininkas"],
  ["PROGRAMERIS", "Programos vadovas"],
  ["FINANSININKAS", "Finansininkas"],
  ["VADOVAS", "Vadovas"],
  ["SAVANORIS", "Savanoris"]
] as const;

const pastovykleAgeGroups = [
  ["VILKAI", "Vilkai"],
  ["SKAUTAI", "Skautai"],
  ["PATYRE_SKAUTAI", "Patyrę skautai"],
  ["VYR_SKAUTAI", "Vyr. skautai"],
  ["VYR_SKAUTES", "Vyr. skautės"],
  ["MIXED", "Mišri grupė"]
] as const;

const eventTargetGroups = [
  ["VILKAI", "Vilkai"],
  ["SKAUTAI", "Skautai"],
  ["PATYRE_SKAUTAI", "Patyrę skautai"],
  ["VYR_SKAUTAI", "Vyr. skautai"],
  ["VYR_SKAUTES", "Vyr. skautės"],
  ["SKAUTAI_VILKAI", "Skautai ir vilkai"],
  ["TEVAI", "Tėvai"],
  ["PROGRAMA", "Bendra programa"]
] as const;

export function EventStaffSection({ context }: { context: EventWorkspaceContext }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("VADOVAS");
  const [targetGroup, setTargetGroup] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadMembers = useCallback(() => api.listEventCandidateMembers(context.token, context.tuntasId, context.event.id)
    .then((response) => setMembers(response.members))
    .catch((cause) => setError(messageOf(cause, "Komandos kandidatų įkelti nepavyko."))), [context.event.id, context.token, context.tuntasId]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || busy) return;
    if (role === "PROGRAMERIS" && !targetGroup) { setError("Pasirinkite programos tikslinę grupę."); return; }
    setBusy("assign"); setError(null); setMessage(null);
    try {
      await api.assignEventRole(context.token, context.tuntasId, context.event.id, { userId, role, targetGroup: role === "PROGRAMERIS" ? targetGroup : null });
      await context.refreshEvent();
      setUserId(""); setTargetGroup(""); setMessage("Komandos rolė priskirta.");
    } catch (cause) { setError(messageOf(cause, "Rolės priskirti nepavyko.")); }
    finally { setBusy(null); }
  }

  async function remove(roleId: string) {
    if (busy || !window.confirm("Pašalinti šią renginio rolę?")) return;
    setBusy(roleId); setError(null); setMessage(null);
    try {
      await api.deleteEventRole(context.token, context.tuntasId, context.event.id, roleId);
      await context.refreshEvent();
      setMessage("Komandos rolė pašalinta.");
    } catch (cause) { setError(messageOf(cause, "Rolės pašalinti nepavyko.")); }
    finally { setBusy(null); }
  }

  return <div className="event-workspace-stack">
    {error && <SkautaiErrorState description={error} />}{message && <p className="inline-success">{message}</p>}
    <section className="workspace-metrics"><Metric label="Priskirtos rolės" value={context.event.eventRoles.length} /><Metric label="Komandos nariai" value={new Set(context.event.eventRoles.map((item) => item.userId)).size} /><Metric label="Kandidatai" value={members.length} /></section>
    {context.canManage && <form className="form-panel event-workspace-form event-create-panel" onSubmit={assign}><div className="form-section-heading"><UsersRound /><div><h3>Priskirti komandos rolę</h3><span>Renginio rolės suteikia aiškią atsakomybę darbo srities viduje.</span></div></div><div className="form-grid"><label className="form-field wide"><span>Narys *</span><select id="event-staff-member" value={userId} onChange={(event) => setUserId(event.target.value)} required><option value="">Pasirinkite narį</option>{members.map((member) => <option key={member.userId} value={member.userId}>{memberName(member)} · {member.email}</option>)}</select></label><label className="form-field"><span>Rolė *</span><select value={role} onChange={(event) => { setRole(event.target.value); if (event.target.value !== "PROGRAMERIS") setTargetGroup(""); }}>{eventRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{role === "PROGRAMERIS" && <label className="form-field"><span>Tikslinė grupė *</span><select value={targetGroup} onChange={(event) => setTargetGroup(event.target.value)} required><option value="">Pasirinkite grupę</option>{eventTargetGroups.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}</div><div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}><Plus size={17} />Priskirti</button></div></form>}
    <section className="data-panel"><div className="data-panel-header"><span>Renginio komanda</span><span>{context.event.eventRoles.length} rolės</span></div>{context.event.eventRoles.length === 0 ? <SkautaiEmptyState compact icon={UsersRound} title="Komanda dar nepriskirta" description="Priskirkite pagrindines renginio ir logistikos roles." action={context.canManage ? <button className="secondary-button" type="button" onClick={() => document.getElementById("event-staff-member")?.focus()}><Plus size={16} />Priskirti pirmą rolę</button> : undefined} /> : <div className="workspace-card-grid">{context.event.eventRoles.map((assigned) => <article className="workspace-record-card" key={assigned.id}><span className="record-icon"><UsersRound size={18} /></span><div><strong>{assigned.userName ?? assigned.userId}</strong><span>{roleLabel(assigned.role)}</span>{assigned.targetGroup && <small>{targetGroupLabel(assigned.targetGroup)}</small>}</div>{context.canManage && <button className="icon-button danger-icon-button" type="button" onClick={() => void remove(assigned.id)} disabled={Boolean(busy)} title="Pašalinti"><Trash2 size={16} /></button>}</article>)}</div>}</section>
  </div>;
}

export function EventPastovyklesSection({ context }: { context: EventWorkspaceContext }) {
  const [pastovykles, setPastovykles] = useState<Pastovykle[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [pastovykleResponse, candidateResponse] = await Promise.all([
      api.listEventPastovykles(context.token, context.tuntasId, context.event.id),
      api.listEventCandidateMembers(context.token, context.tuntasId, context.event.id).catch(() => ({ members: [], total: 0 }))
    ]);
    setPastovykles(pastovykleResponse.pastovykles); setMembers(candidateResponse.members);
  }, [context.event.id, context.token, context.tuntasId]);

  useEffect(() => { refresh().catch((cause) => setError(messageOf(cause, "Pastovyklių įkelti nepavyko."))); }, [refresh]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!name.trim() || busy) return;
    setBusy("create"); setError(null);
    try { await api.createEventPastovykle(context.token, context.tuntasId, context.event.id, { name: name.trim(), ageGroup: optional(ageGroup), responsibleUserId: optional(responsibleUserId), notes: optional(notes) }); setName(""); setAgeGroup(""); setResponsibleUserId(""); setNotes(""); await refresh(); await context.refreshEvent(); }
    catch (cause) { setError(messageOf(cause, "Pastovyklės sukurti nepavyko.")); } finally { setBusy(null); }
  }

  async function remove(id: string) {
    if (busy || !window.confirm("Ištrinti pastovyklę?")) return; setBusy(id); setError(null);
    try { await api.deleteEventPastovykle(context.token, context.tuntasId, context.event.id, id); await refresh(); }
    catch (cause) { setError(messageOf(cause, "Pastovyklės ištrinti nepavyko.")); } finally { setBusy(null); }
  }

  return <div className="event-workspace-stack">{error && <SkautaiErrorState description={error} />}
    {context.canManage && <form className="form-panel event-workspace-form event-create-panel" onSubmit={create}><div className="form-section-heading"><TentTree /><div><h3>Nauja pastovyklė</h3><span>Sukurkite renginio grupę ir iš karto nurodykite atsakingą vadovą.</span></div></div><div className="form-grid"><label className="form-field"><span>Pavadinimas *</span><input id="event-pastovykle-name" value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="form-field"><span>Amžiaus grupė</span><select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}><option value="">Pasirinkite grupę</option>{pastovykleAgeGroups.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-field wide"><span>Atsakingas vadovas</span><select value={responsibleUserId} onChange={(event) => setResponsibleUserId(event.target.value)}><option value="">Nepriskirtas</option>{members.map((member) => <option key={member.userId} value={member.userId}>{memberName(member)}</option>)}</select></label><label className="form-field wide"><span>Pastabos</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div><div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}><Plus size={17} />Sukurti</button></div></form>}
    <section className="workspace-card-grid">{pastovykles.length === 0 ? <SkautaiEmptyState icon={TentTree} title="Pastovyklių dar nėra" description="Jos reikalingos renginio grupėms, vadovams ir inventoriaus paskirstymui." action={context.canManage ? <button className="secondary-button" type="button" onClick={() => document.getElementById("event-pastovykle-name")?.focus()}><Plus size={16} />Sukurti pirmąją pastovyklę</button> : undefined} /> : pastovykles.map((pastovykle) => <article className="workspace-summary-card" key={pastovykle.id}><span className="record-icon"><TentTree size={19} /></span><div><strong>{pastovykle.name}</strong><span>{pastovykle.ageGroup ? ageGroupLabel(pastovykle.ageGroup) : "Amžiaus grupė nenurodyta"}</span><small>{members.find((member) => member.userId === pastovykle.responsibleUserId) ? `Vadovas: ${memberName(members.find((member) => member.userId === pastovykle.responsibleUserId)! )}` : "Vadovas nepriskirtas"}</small>{pastovykle.notes && <p>{pastovykle.notes}</p>}</div>{context.canManage && <button className="icon-button danger-icon-button" type="button" onClick={() => void remove(pastovykle.id)} disabled={Boolean(busy)} title="Ištrinti pastovyklę"><Trash2 size={16} /></button>}</article>)}</section>
  </div>;
}

export function EventTemplatesSection({ context }: { context: EventWorkspaceContext }) {
  const [templates, setTemplates] = useState<InventoryTemplate[]>([]);
  const [editing, setEditing] = useState<InventoryTemplate | null>(null);
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState(context.event.type);
  const [lines, setLines] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => api.listInventoryTemplates(context.token, context.tuntasId).then((response) => setTemplates(response.templates)), [context.token, context.tuntasId]);
  useEffect(() => { refresh().catch((cause) => setError(messageOf(cause, "Šablonų įkelti nepavyko."))); }, [refresh]);

  function startEdit(template: InventoryTemplate) { setEditing(template); setName(template.name); setEventType(template.eventType ?? ""); setLines(template.items.map((item) => `${item.itemName} | ${item.quantity} | ${item.category ?? ""}`).join("\n")); }
  function reset() { setEditing(null); setName(""); setEventType(context.event.type); setLines(""); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const parsed = parseTemplateLines(lines); if (parsed.error) { setError(parsed.error); return; }
    const items = parsed.items; if (!name.trim() || items.length === 0) { setError("Nurodykite pavadinimą ir bent vieną inventoriaus eilutę."); return; }
    setBusy("save"); setError(null); setMessage(null);
    try { if (editing) await api.updateInventoryTemplate(context.token, context.tuntasId, editing.id, { name: name.trim(), eventType: optional(eventType), clearEventType: !eventType, items }); else await api.createInventoryTemplate(context.token, context.tuntasId, { name: name.trim(), eventType: optional(eventType), items }); reset(); await refresh(); setMessage("Šablonas išsaugotas."); }
    catch (cause) { setError(messageOf(cause, "Šablono išsaugoti nepavyko.")); } finally { setBusy(null); }
  }

  async function apply(template: InventoryTemplate, reserve: boolean) {
    if (busy) return; setBusy(template.id); setError(null); setMessage(null);
    try { const result = reserve ? await api.applyInventoryTemplateWithReservation(context.token, context.tuntasId, context.event.id, { templateId: template.id }) : await api.applyInventoryTemplateToEvent(context.token, context.tuntasId, context.event.id, { templateId: template.id }); setMessage(`Šablonas pritaikytas: rezervuota ${result.reservedTotal}, pirkti ${result.toPurchaseTotal}.`); await context.refreshEvent(); }
    catch (cause) { setError(messageOf(cause, "Šablono pritaikyti nepavyko.")); } finally { setBusy(null); }
  }

  async function remove(id: string) { if (busy || !window.confirm("Ištrinti šį inventoriaus šabloną?")) return; setBusy(id); try { await api.deleteInventoryTemplate(context.token, context.tuntasId, id); await refresh(); } catch (cause) { setError(messageOf(cause, "Šablono ištrinti nepavyko.")); } finally { setBusy(null); } }

  return <div className="event-workspace-stack">{error && <SkautaiErrorState description={error} />}{message && <p className="inline-success">{message}</p>}
    {context.canManageInventory && <form className={`form-panel event-workspace-form event-create-panel${editing ? " is-editing" : ""}`} onSubmit={save}><div className="form-section-heading"><Boxes /><div><h3>{editing ? "Redaguoti šabloną" : "Naujas inventoriaus šablonas"}</h3><span>Viena eilutė aprašo vieną inventoriaus poreikį.</span></div></div><div className="form-grid"><label className="form-field"><span>Pavadinimas *</span><input id="event-template-name" value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="form-field"><span>Renginio tipas</span><select value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="">Visiems renginiams</option><option value="STOVYKLA">Stovykla</option><option value="SUEIGA">Sueiga</option><option value="RENGINYS">Renginys</option></select></label><div className="template-syntax-hint wide"><code>Pavadinimas | Kiekis | Kategorija</code><span>Pavyzdys: Palapinė | 4 | CAMPING. Kiekis turi būti teigiamas sveikasis skaičius; kiekvieną poreikį rašykite naujoje eilutėje.</span></div><label className="form-field wide"><span>Inventoriaus eilutės *</span><textarea rows={6} value={lines} onChange={(event) => setLines(event.target.value)} placeholder={"Palapinė | 4 | CAMPING\nViryklė | 2 | COOKING"} required /></label></div><div className="form-actions">{editing && <button className="secondary-button" type="button" onClick={reset}>Atšaukti</button>}<button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busy)}>{editing ? "Išsaugoti" : "Sukurti"}</button></div></form>}
    <section className="workspace-card-grid">{templates.length === 0 ? <SkautaiEmptyState icon={Boxes} title="Šablonų dar nėra" description="Sukurkite dažnai pasikartojančio renginio inventoriaus sąrašą." action={context.canManageInventory ? <button className="secondary-button" type="button" onClick={() => document.getElementById("event-template-name")?.focus()}><Plus size={16} />Sukurti pirmą šabloną</button> : undefined} /> : templates.map((template) => <article className="workspace-summary-card" key={template.id}><span className="record-icon"><Boxes size={19} /></span><div><strong>{template.name}</strong><span>{template.eventType ? eventTypeLabel(template.eventType) : "Visiems renginiams"}</span><small>{template.items.length} eilutės · {template.items.reduce((sum, item) => sum + item.quantity, 0)} vnt.</small></div><div className="workspace-card-actions">{context.canManageInventory && <div className="workspace-card-management-actions"><button className="icon-button" type="button" onClick={() => startEdit(template)} title="Redaguoti"><Edit3 size={16} /></button><button className="icon-button danger-icon-button" type="button" onClick={() => void remove(template.id)} title="Ištrinti"><Trash2 size={16} /></button></div>}<div className="workspace-card-apply-actions"><button className="secondary-button" type="button" disabled={!context.canManageInventory || Boolean(busy)} onClick={() => void apply(template, false)}>Į planą</button><button className="primary-button compact-primary-button" type="button" disabled={!context.canManageInventory || Boolean(busy)} onClick={() => void apply(template, true)}>Planas + rezervacija</button></div></div></article>)}</section>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function ageGroupLabel(value: string) { return pastovykleAgeGroups.find(([code]) => code === value)?.[1] ?? value; }
function targetGroupLabel(value: string) { return eventTargetGroups.find(([code]) => code === value)?.[1] ?? value; }
function memberName(member: Member) { return [member.name, member.surname].filter(Boolean).join(" ") || member.email; }
function optional(value: string) { const trimmed = value.trim(); return trimmed ? trimmed : null; }
function messageOf(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
function parseTemplateLines(value: string) {
  const items: Array<{ itemName: string; quantity: number; category: string | null }> = [];
  const lines = value.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    const [itemName = "", quantityText = "", category = ""] = line.split("|").map((part) => part.trim());
    const quantity = Number(quantityText);
    if (!itemName) return { items: [], error: `${index + 1} eilutėje trūksta pavadinimo.` };
    if (!Number.isInteger(quantity) || quantity < 1) return { items: [], error: `${index + 1} eilutėje kiekis turi būti teigiamas sveikasis skaičius.` };
    items.push({ itemName, quantity, category: category || null });
  }
  return { items, error: null as string | null };
}
