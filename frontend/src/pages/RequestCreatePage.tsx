import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Minus, PackageCheck, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Item, OrganizationalUnit } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiEmptyState, SkautaiErrorState, SkautaiPageShell, SkautaiSearchBar } from "../components/ui/Skautai";
import { finiteCount } from "../utils/display";
import { hasPermission } from "../utils/permissions";

type RequestCreateMode = "requisition" | "shared";

type RequisitionLine = {
  key: string;
  requestType: "NEW_ITEM" | "RESTOCK_EXISTING";
  existingItemId: string;
  itemName: string;
  itemDescription: string;
  quantity: string;
  notes: string;
};

const emptyLine = (): RequisitionLine => ({
  key: `${Date.now()}-${Math.random()}`,
  requestType: "NEW_ITEM",
  existingItemId: "",
  itemName: "",
  itemDescription: "",
  quantity: "1",
  notes: ""
});

export function RequestCreatePage({ mode }: { mode: RequestCreateMode }) {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [unitId, setUnitId] = useState("");
  const [neededByDate, setNeededByDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<RequisitionLine[]>([emptyLine()]);
  const [selectedShared, setSelectedShared] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = mode === "requisition"
    ? hasPermission(auth?.permissions, "requisitions.create")
    : hasPermission(auth?.permissions, "items.request.bendras");

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canCreate) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.listOrganizationalUnits(auth.token, auth.activeTuntasId).catch(() => ({ units: [], total: 0 })),
      api.listItems(auth.token, auth.activeTuntasId, {
        status: "ACTIVE",
        sharedOnly: mode === "shared",
        limit: 200,
        offset: 0
      })
    ])
      .then(([unitResponse, itemResponse]) => {
        if (cancelled) return;
        setUnits(unitResponse.units);
        setItems(itemResponse.items);
        if (unitResponse.units.length === 1) setUnitId(unitResponse.units[0].id);
      })
      .catch((cause) => {
        if (!cancelled) setError(messageOf(cause, "Nepavyko paruošti prašymo formos."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [auth?.activeTuntasId, auth?.token, canCreate, mode]);

  const sharedItems = useMemo(() => items
    .filter((item) => item.custodianId == null && item.status === "ACTIVE" && finiteCount(item.quantity) > 0)
    .filter((item) => {
      const query = search.trim().toLocaleLowerCase("lt-LT");
      if (!query) return true;
      return [item.name, item.description ?? "", item.category]
        .join(" ")
        .toLocaleLowerCase("lt-LT")
        .includes(query);
    })
    .sort((left, right) => left.name.localeCompare(right.name, "lt")), [items, search]);

  function updateLine(key: string, patch: Partial<RequisitionLine>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  }

  function setSharedQuantity(item: Item, value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setSelectedShared((current) => ({ ...current, [item.id]: "" }));
      return;
    }
    const quantity = Math.min(finiteCount(item.quantity), Math.max(1, Number(digits)));
    setSelectedShared((current) => ({ ...current, [item.id]: String(quantity) }));
  }

  function adjustSharedQuantity(item: Item, delta: number) {
    const current = Number(selectedShared[item.id] ?? 0);
    const next = Math.min(finiteCount(item.quantity), Math.max(0, current + delta));
    setSelectedShared((selection) => {
      if (next === 0) {
        const copy = { ...selection };
        delete copy[item.id];
        return copy;
      }
      return { ...selection, [item.id]: String(next) };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !canCreate || isSaving) return;
    setError(null);

    try {
      setIsSaving(true);
      if (mode === "requisition") {
        const requestLines = lines.map((line) => {
          const quantity = Number(line.quantity);
          const selectedItem = items.find((item) => item.id === line.existingItemId);
          if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Kiekvienos eilutės kiekis turi būti teigiamas sveikasis skaičius.");
          if (line.requestType === "RESTOCK_EXISTING" && !selectedItem) throw new Error("Papildymo eilutei pasirinkite esamą inventoriaus įrašą.");
          if (line.requestType === "NEW_ITEM" && !line.itemName.trim()) throw new Error("Įveskite kiekvieno naujo daikto pavadinimą.");
          return {
            itemName: selectedItem?.name ?? line.itemName.trim(),
            itemDescription: line.requestType === "NEW_ITEM" ? optional(line.itemDescription) : null,
            quantity,
            notes: optional(line.notes),
            requestType: line.requestType,
            existingItemId: line.requestType === "RESTOCK_EXISTING" ? line.existingItemId : null
          };
        });
        const created = await api.createRequisition(auth.token, auth.activeTuntasId, {
          requestingUnitId: optional(unitId),
          neededByDate: optional(neededByDate),
          notes: optional(notes),
          items: requestLines
        });
        navigate(`/purchases/${created.id}`);
      } else {
        if (!unitId) throw new Error("Pasirinkite vienetą, kuriam kuriamas paėmimo prašymas.");
        const requestItems = Object.entries(selectedShared).map(([itemId, quantityText]) => {
          const item = items.find((candidate) => candidate.id === itemId);
          const quantity = Number(quantityText);
          if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > finiteCount(item.quantity)) {
            throw new Error("Patikrinkite pasirinktų daiktų kiekius.");
          }
          return { itemId, quantity };
        });
        if (requestItems.length === 0) throw new Error("Pasirinkite bent vieną bendro inventoriaus daiktą.");
        const created = await api.createSharedInventoryRequest(auth.token, auth.activeTuntasId, {
          itemDescription: requestItems.length === 1
            ? items.find((item) => item.id === requestItems[0].itemId)?.name
            : "Keli bendro inventoriaus daiktai",
          requestingUnitId: unitId,
          neededByDate: optional(neededByDate),
          notes: optional(notes),
          items: requestItems
        });
        navigate(`/pickup-requests/${created.id}`);
      }
    } catch (cause) {
      setError(messageOf(cause, "Prašymo sukurti nepavyko."));
    } finally {
      setIsSaving(false);
    }
  }

  const title = mode === "requisition" ? "Naujas pirkimo prašymas" : "Naujas paėmimo prašymas";
  const backTo = mode === "requisition" ? "/purchases" : "/pickup-requests";

  return (
    <SkautaiPageShell
      className="request-create-page"
      eyebrow="Prašymai"
      title={title}
      description={mode === "requisition"
        ? "Prašykite naujo inventoriaus arba papildykite esamo įrašo atsargas."
        : "Pasirinkite bendro tunto inventoriaus daiktus ir kiekius savo vienetui."}
      width="wide"
    >
      <Link className="back-link" to={backTo}><ArrowLeft size={17} aria-hidden="true" />Grįžti į sąrašą</Link>
      {!canCreate && <SkautaiEmptyState icon={mode === "requisition" ? ShoppingCart : PackageCheck} title="Prašymo kurti negalite" description="Šiam veiksmui reikia atitinkamos prašymų kūrimo teisės." />}
      {error && <SkautaiErrorState description={error} />}
      {isLoading && <div className="table-state"><Loader2 className="spin" size={22} aria-hidden="true" />Ruošiama forma...</div>}

      {canCreate && !isLoading && (
        <form className="request-create-layout" onSubmit={submit}>
          <section className="form-panel request-create-main">
            {mode === "requisition" ? (
              <>
                <div className="form-section-heading"><ShoppingCart aria-hidden="true" /><div><h3>Prašomos eilutės</h3><span>Viename prašyme galite pateikti kelis naujus daiktus arba papildymus.</span></div></div>
                <div className="request-line-list">
                  {lines.map((line, index) => (
                    <fieldset className="request-line-card" key={line.key} disabled={isSaving}>
                      <legend>{index + 1}. eilutė</legend>
                      <div className="form-grid">
                        <label className="form-field"><span>Prašymo tipas</span><select value={line.requestType} onChange={(event) => updateLine(line.key, { requestType: event.target.value as RequisitionLine["requestType"], existingItemId: "" })}><option value="NEW_ITEM">Naujas daiktas</option><option value="RESTOCK_EXISTING">Papildyti esamą</option></select></label>
                        {line.requestType === "RESTOCK_EXISTING" ? (
                          <label className="form-field wide"><span>Inventoriaus įrašas *</span><select value={line.existingItemId} onChange={(event) => updateLine(line.key, { existingItemId: event.target.value })} required><option value="">Pasirinkite įrašą</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} · dabar {finiteCount(item.quantity)} {item.unitOfMeasure ?? "vnt."}</option>)}</select></label>
                        ) : (
                          <><label className="form-field"><span>Pavadinimas *</span><input value={line.itemName} onChange={(event) => updateLine(line.key, { itemName: event.target.value })} required /></label><label className="form-field wide"><span>Aprašymas</span><input value={line.itemDescription} onChange={(event) => updateLine(line.key, { itemDescription: event.target.value })} /></label></>
                        )}
                        <label className="form-field"><span>Kiekis *</span><input type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} required /></label>
                        <label className="form-field wide"><span>Eilutės pastabos</span><input value={line.notes} onChange={(event) => updateLine(line.key, { notes: event.target.value })} /></label>
                      </div>
                      {lines.length > 1 && <button className="request-line-remove" type="button" onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))}><Trash2 size={16} aria-hidden="true" />Pašalinti eilutę</button>}
                    </fieldset>
                  ))}
                </div>
                <button className="secondary-button" type="button" onClick={() => setLines((current) => [...current, emptyLine()])}><Plus size={17} aria-hidden="true" />Pridėti eilutę</button>
              </>
            ) : (
              <>
                <div className="form-section-heading"><PackageCheck aria-hidden="true" /><div><h3>Bendras inventorius</h3><span>Rodomi tik aktyvūs daiktai, kurių yra sandėlyje.</span></div></div>
                <SkautaiSearchBar value={search} onChange={setSearch} placeholder="Ieškoti bendrame inventoriuje..." />
                {sharedItems.length === 0 ? <SkautaiEmptyState compact icon={PackageCheck} title="Tinkamų daiktų nerasta" description="Pakeiskite paiešką arba patikrinkite bendro inventoriaus likučius." /> : (
                  <div className="shared-request-picker">
                    {sharedItems.map((item) => {
                      const selected = Object.prototype.hasOwnProperty.call(selectedShared, item.id);
                      return (
                        <article className={`shared-request-item${selected ? " is-selected" : ""}`} key={item.id}>
                          <button className="shared-request-item-copy" type="button" onClick={() => setSelectedShared((current) => selected ? withoutKey(current, item.id) : { ...current, [item.id]: "1" })}>
                            <strong>{item.name}</strong><span>{item.description ?? item.category}</span><small>Likutis: {finiteCount(item.quantity)} {item.unitOfMeasure ?? "vnt."}</small>
                          </button>
                          {selected && <div className="quantity-stepper"><button type="button" aria-label={`Mažinti ${item.name} kiekį`} onClick={() => adjustSharedQuantity(item, -1)}><Minus size={15} /></button><input aria-label={`${item.name} kiekis`} inputMode="numeric" value={selectedShared[item.id]} onChange={(event) => setSharedQuantity(item, event.target.value)} /><button type="button" aria-label={`Didinti ${item.name} kiekį`} onClick={() => adjustSharedQuantity(item, 1)}><Plus size={15} /></button></div>}
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="form-panel request-create-side">
            <h3>Prašymo informacija</h3>
            <label className="form-field"><span>Vienetas {mode === "shared" ? "*" : ""}</span><select value={unitId} onChange={(event) => setUnitId(event.target.value)} required={mode === "shared"}><option value="">{mode === "requisition" ? "Tunto lygmuo" : "Pasirinkite vienetą"}</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
            <label className="form-field"><span>Reikia iki</span><input type="date" value={neededByDate} onChange={(event) => setNeededByDate(event.target.value)} /></label>
            <label className="form-field"><span>Bendros pastabos</span><textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            {mode === "shared" && <div className="request-selection-summary"><span>Pasirinkta</span><strong>{Object.keys(selectedShared).length} įrašai · {Object.values(selectedShared).reduce((sum, value) => sum + (Number(value) || 0), 0)} vnt.</strong></div>}
            <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? "Kuriama..." : "Pateikti prašymą"}</button>
          </aside>
        </form>
      )}
    </SkautaiPageShell>
  );
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function withoutKey(record: Record<string, string>, key: string) {
  const copy = { ...record };
  delete copy[key];
  return copy;
}

function messageOf(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}
