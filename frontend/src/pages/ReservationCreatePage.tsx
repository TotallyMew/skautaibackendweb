import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarPlus, PackagePlus, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { Item, Location, OrganizationalUnit, ReservationAvailabilityItem } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { itemTypeLabel } from "../utils/display";
import { hasPermission } from "../utils/permissions";

type ReservationItemDraft = {
  itemId: string;
  quantity: string;
};

type FormState = {
  title: string;
  startDate: string;
  endDate: string;
  requestingUnitId: string;
  pickupLocationId: string;
  returnLocationId: string;
  notes: string;
  items: ReservationItemDraft[];
};

const initialForm: FormState = {
  title: "",
  startDate: todayInputValue(),
  endDate: todayInputValue(),
  requestingUnitId: "",
  pickupLocationId: "",
  returnLocationId: "",
  notes: "",
  items: [{ itemId: "", quantity: "1" }]
};

export function ReservationCreatePage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [availability, setAvailability] = useState<Record<string, ReservationAvailabilityItem>>({});
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreateReservation = hasPermission(auth?.permissions, "reservations.create");
  const canViewUnits = hasPermission(auth?.permissions, "organizational_units.view");
  const canSubmit = Boolean(
    auth?.token &&
    auth.activeTuntasId &&
    canCreateReservation &&
    form.startDate &&
    form.endDate &&
    normalizedItems(form.items).length > 0
  );

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canCreateReservation) return;
    let isCancelled = false;
    setIsLoadingContext(true);
    setError(null);

    Promise.all([
      api.listItems(auth.token, auth.activeTuntasId, { status: "ACTIVE", limit: 200, offset: 0 }),
      api.listLocations(auth.token, auth.activeTuntasId).catch(() => ({ locations: [], total: 0 })),
      canViewUnits ? api.listOrganizationalUnits(auth.token, auth.activeTuntasId).catch(() => ({ units: [], total: 0 })) : Promise.resolve({ units: [], total: 0 })
    ])
      .then(([itemResponse, locationResponse, unitResponse]) => {
        if (isCancelled) return;
        setItems(itemResponse.items);
        setLocations(locationResponse.locations);
        setUnits(unitResponse.units);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Rezervacijos duomenų užkrauti nepavyko.");
          setItems([]);
          setLocations([]);
          setUnits([]);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingContext(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, canCreateReservation, canViewUnits]);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !form.startDate || !form.endDate || form.endDate < form.startDate) {
      setAvailability({});
      return;
    }
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsCheckingAvailability(true);
      api.getReservationAvailability(auth.token, auth.activeTuntasId!, form.startDate, form.endDate)
        .then((response) => { if (!cancelled) setAvailability(Object.fromEntries(response.items.map((item) => [item.itemId, item]))); })
        .catch(() => { if (!cancelled) setAvailability({}); })
        .finally(() => { if (!cancelled) setIsCheckingAvailability(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timeoutId); };
  }, [auth?.activeTuntasId, auth?.token, form.endDate, form.startDate]);

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.name.localeCompare(right.name, "lt")),
    [items]
  );

  const sortedLocations = useMemo(
    () => [...locations].filter((location) => location.isLeafSelectable).sort((left, right) => left.fullPath.localeCompare(right.fullPath, "lt")),
    [locations]
  );

  const sortedUnits = useMemo(
    () => [...units].sort((left, right) => left.name.localeCompare(right.name, "lt")),
    [units]
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index: number, patch: Partial<ReservationItemDraft>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }));
  }

  function addItemRow() {
    setForm((current) => ({ ...current, items: [...current.items, { itemId: "", quantity: "1" }] }));
  }

  function removeItemRow(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !canCreateReservation) return;

    const reservationItems = normalizedItems(form.items);
    if (reservationItems.length === 0) return setError("Pasirinkite bent vieną inventoriaus įrašą.");
    if (form.endDate < form.startDate) return setError("Pabaigos data negali būti ankstesnė už pradžios datą.");
    const unavailable = reservationItems.find((line) => availability[line.itemId] && line.quantity > availability[line.itemId].availableQuantity);
    if (unavailable) {
      const item = items.find((candidate) => candidate.id === unavailable.itemId);
      return setError(`„${item?.name ?? "Inventorius"}“ pasirinktam laikui galima rezervuoti tik ${availability[unavailable.itemId].availableQuantity} vnt.`);
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reservation = await api.createReservation(auth.token, auth.activeTuntasId, {
        title: form.title.trim() || "Rezervacija",
        items: reservationItems,
        startDate: form.startDate,
        endDate: form.endDate,
        requestingUnitId: optional(form.requestingUnitId),
        pickupLocationId: optional(form.pickupLocationId),
        returnLocationId: optional(form.returnLocationId),
        notes: optional(form.notes)
      });
      navigate(`/reservations/${reservation.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Rezervacijos sukurti nepavyko.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canCreateReservation) {
    return (
      <section className="work-area">
        <ShieldCheck size={34} aria-hidden="true" />
        <div>
          <h2>Rezervacijos kūrimui reikia teisės</h2>
          <p>Šis veiksmas rodomas tik vartotojams, kurie Android programėlėje gali kurti rezervacijas.</p>
          <Link className="secondary-button" to="/reservations">Grįžti į rezervacijas</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/reservations">
            <ArrowLeft size={17} aria-hidden="true" />
            Grįžti į prašymus
          </Link>
          <h2>Nauja rezervacija</h2>
        </div>
      </div>

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form className="form-panel" onSubmit={submit}>
        <section className="form-section">
          <div className="form-section-heading">
            <CalendarPlus size={20} aria-hidden="true" />
            <div>
              <h3>Laikas ir kontekstas</h3>
              <span>Rezervacijos eiga bus tvirtinama pagal tavo vienetą ir turimas teises.</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field wide">
              <span>Pavadinimas</span>
              <input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Pvz. Stovyklos inventorius" />
            </label>
            <label className="form-field">
              <span>Pradžia</span>
              <input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Pabaiga</span>
              <input type="date" value={form.endDate} onChange={(event) => update("endDate", event.target.value)} required />
            </label>
            {sortedUnits.length > 0 && (
              <label className="form-field">
                <span>Prašantis vienetas</span>
                <select value={form.requestingUnitId} onChange={(event) => update("requestingUnitId", event.target.value)}>
                  <option value="">Be vieneto</option>
                  {sortedUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <PackagePlus size={20} aria-hidden="true" />
            <div>
              <h3>Inventorius</h3>
              <span>{isLoadingContext ? "Kraunami aktyvūs inventoriaus įrašai..." : isCheckingAvailability ? "Tikrinamas pasirinkto laikotarpio prieinamumas..." : "Kiekiai rodo realų likutį pasirinktam laikotarpiui."}</span>
            </div>
          </div>

          <div className="reservation-item-list">
            {form.items.map((item, index) => (
              <div className="reservation-item-row" key={index}>
                <label className="form-field">
                  <span>Inventorius</span>
                  <select value={item.itemId} onChange={(event) => updateItem(index, { itemId: event.target.value })} required>
                    <option value="">Pasirinkti įrašą</option>
                    {sortedItems.map((inventoryItem) => (
                      <option key={inventoryItem.id} value={inventoryItem.id}>
                        {inventoryItem.name} / {itemTypeLabel(inventoryItem.type)} / galima {availability[inventoryItem.id]?.availableQuantity ?? inventoryItem.quantity} {inventoryItem.unitOfMeasure ?? "vnt."}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Kiekis</span>
                  <input min="1" max={item.itemId ? availability[item.itemId]?.availableQuantity ?? items.find((candidate) => candidate.id === item.itemId)?.quantity : undefined} type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} required />
                </label>
                <button className="icon-button danger-icon-button" type="button" title="Pašalinti eilutę" onClick={() => removeItemRow(index)}>
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <button className="secondary-button compact-inline-button" type="button" onClick={addItemRow}>
            <Plus size={17} aria-hidden="true" />
            Pridėti inventorių
          </button>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <CalendarPlus size={20} aria-hidden="true" />
            <div>
              <h3>Paėmimas ir grąžinimas</h3>
              <span>Lokacijos neprivalomos, bet padeda inventorininkui aiškiau suplanuoti išdavimą.</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Paėmimo lokacija</span>
              <select value={form.pickupLocationId} onChange={(event) => update("pickupLocationId", event.target.value)}>
                <option value="">Nenurodyta</option>
                {sortedLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.fullPath}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Grąžinimo lokacija</span>
              <select value={form.returnLocationId} onChange={(event) => update("returnLocationId", event.target.value)}>
                <option value="">Nenurodyta</option>
                {sortedLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.fullPath}</option>
                ))}
              </select>
            </label>
            <label className="form-field wide">
              <span>Pastabos</span>
              <textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
            </label>
          </div>
        </section>

        <div className="form-actions">
          <Link className="secondary-button" to="/reservations">Atšaukti</Link>
          <button className="primary-button compact-primary-button" type="submit" disabled={!canSubmit || isSubmitting}>
            <Save size={17} aria-hidden="true" />
            {isSubmitting ? "Kuriama..." : "Sukurti rezervaciją"}
          </button>
        </div>
      </form>
    </section>
  );
}

function normalizedItems(items: ReservationItemDraft[]) {
  const byItem = new Map<string, number>();
  items.forEach((item) => {
    const itemId = item.itemId.trim();
    const quantity = Number(item.quantity);
    if (!itemId || !Number.isFinite(quantity) || quantity <= 0) return;
    byItem.set(itemId, (byItem.get(itemId) ?? 0) + Math.floor(quantity));
  });
  return Array.from(byItem.entries()).map(([itemId, quantity]) => ({ itemId, quantity }));
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
