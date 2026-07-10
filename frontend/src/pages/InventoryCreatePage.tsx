import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, PackagePlus, Save, ShieldCheck } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { CreateItemRequest, Item, Location, Member, OrganizationalUnit, UpdateItemRequest } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { canCreateItems, hasPermission } from "../utils/permissions";

type FormState = {
  name: string;
  description: string;
  type: string;
  category: string;
  condition: string;
  quantity: string;
  unitOfMeasure: string;
  minimumQuantity: string;
  isConsumable: boolean;
  custodianId: string;
  locationId: string;
  responsibleUserId: string;
  temporaryStorageLabel: string;
  purchaseDate: string;
  purchasePrice: string;
  notes: string;
  status: string;
};

const initialForm: FormState = {
  name: "",
  description: "",
  type: "COLLECTIVE",
  category: "",
  condition: "GOOD",
  quantity: "1",
  unitOfMeasure: "vnt.",
  minimumQuantity: "",
  isConsumable: false,
  custodianId: "",
  locationId: "",
  responsibleUserId: "",
  temporaryStorageLabel: "",
  purchaseDate: "",
  purchasePrice: "",
  notes: "",
  status: "ACTIVE"
};

export function InventoryCreatePage() {
  const { itemId } = useParams();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [originalItem, setOriginalItem] = useState<Item | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(itemId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(itemId);
  const hasAccess = isEditing ? hasPermission(auth?.permissions, "items.update") : canCreateItems(auth?.permissions);
  const canSubmit = Boolean(auth?.token && auth.activeTuntasId && hasAccess && form.name.trim() && form.category.trim() && Number(form.quantity) >= 0);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) return;

    let isCancelled = false;
    const contextRequests = [
      api.listLocations(auth.token, auth.activeTuntasId).then((response) => response.locations).catch(() => []),
      api.listOrganizationalUnits(auth.token, auth.activeTuntasId).then((response) => response.units).catch(() => []),
      api.listMembers(auth.token, auth.activeTuntasId).then((response) => response.members).catch(() => [])
    ] as const;

    Promise.all(contextRequests).then(([nextLocations, nextUnits, nextMembers]) => {
      if (isCancelled) return;
      setLocations(nextLocations);
      setUnits(nextUnits);
      setMembers(nextMembers);
    });

    if (!itemId) {
      setIsLoading(false);
      return () => {
        isCancelled = true;
      };
    }

    setIsLoading(true);
    setError(null);
    api.getItem(auth.token, auth.activeTuntasId, itemId)
      .then((item) => {
        if (isCancelled) return;
        setOriginalItem(item);
        setForm(fromItem(item));
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Nepavyko įkelti inventoriaus įrašo.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, itemId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !hasAccess) return;

    const payload = toPayload(form);
    if (!payload.name || !payload.category || payload.quantity < 0) {
      setError("Užpildyk pavadinimą, kategoriją ir nurodyk tinkamą kiekį.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const item = isEditing && itemId
        ? await api.updateItem(auth.token, auth.activeTuntasId, itemId, toUpdatePayload(form, originalItem))
        : await api.createItem(auth.token, auth.activeTuntasId, payload);
      navigate(`/inventory/${item.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : `Nepavyko ${isEditing ? "atnaujinti" : "sukurti"} inventoriaus įrašo.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasAccess) {
    return (
      <section className="work-area">
        <ShieldCheck size={34} aria-hidden="true" />
        <div>
          <h2>{isEditing ? "Inventoriaus redagavimui" : "Inventoriaus kūrimui"} reikia teisės</h2>
          <p>Šis veiksmas prieinamas tik vartotojams, turintiems atitinkamą inventoriaus valdymo teisę.</p>
          <Link className="secondary-button" to="/inventory">Grįžti į inventorių</Link>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="detail-page">
        <div className="table-state">
          <Loader2 className="spin" size={22} aria-hidden="true" />
          Kraunamas inventoriaus įrašas...
        </div>
      </section>
    );
  }

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to={isEditing && itemId ? `/inventory/${itemId}` : "/inventory"}>
            <ArrowLeft size={17} aria-hidden="true" />
            {isEditing ? "Grįžti į įrašą" : "Grįžti į inventorių"}
          </Link>
          <h2>{isEditing ? "Redaguoti inventoriaus įrašą" : "Naujas inventoriaus įrašas"}</h2>
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
            <PackagePlus size={20} aria-hidden="true" />
            <div>
              <h3>Pagrindinė informacija</h3>
              <span>Bendras tunto inventorius arba naujas katalogo įrašas.</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field wide">
              <span>Pavadinimas</span>
              <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Kategorija</span>
              <input value={form.category} onChange={(event) => update("category", event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Tipas</span>
              <select value={form.type} onChange={(event) => update("type", event.target.value)}>
                <option value="COLLECTIVE">Bendras</option>
                <option value="ASSIGNED">Priskirtas</option>
                <option value="INDIVIDUAL">Asmeninis</option>
              </select>
            </label>
            <label className="form-field wide">
              <span>Aprašymas</span>
              <textarea rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} />
            </label>
            {isEditing && (
              <label className="form-field">
                <span>Būsena</span>
                <select value={form.status} onChange={(event) => update("status", event.target.value)}>
                  <option value="ACTIVE">Aktyvus</option>
                  <option value="INACTIVE">Neaktyvus</option>
                  <option value="PENDING_APPROVAL">Laukia tvirtinimo</option>
                </select>
              </label>
            )}
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <CheckCircle2 size={20} aria-hidden="true" />
            <div>
              <h3>Kiekis ir būklė</h3>
              <span>Šie laukai naudojami sąrašuose, užsakymuose ir trūkumo įspėjimuose.</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Kiekis</span>
              <input min="0" type="number" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Vienetas</span>
              <input value={form.unitOfMeasure} onChange={(event) => update("unitOfMeasure", event.target.value)} />
            </label>
            <label className="form-field">
              <span>Minimalus kiekis</span>
              <input min="0" type="number" value={form.minimumQuantity} onChange={(event) => update("minimumQuantity", event.target.value)} />
            </label>
            <label className="form-field">
              <span>Būklė</span>
              <select value={form.condition} onChange={(event) => update("condition", event.target.value)}>
                <option value="GOOD">Gera</option>
                <option value="FAIR">Vidutinė</option>
                <option value="POOR">Prasta</option>
                <option value="DAMAGED">Sugadinta</option>
              </select>
            </label>
            <label className="toggle-field form-toggle">
              <input type="checkbox" checked={form.isConsumable} onChange={(event) => update("isConsumable", event.target.checked)} />
              Sunaudojamas inventorius
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <PackagePlus size={20} aria-hidden="true" />
            <div>
              <h3>Vieta ir pirkimas</h3>
              <span>Užtenka laikino saugojimo teksto, jei lokacijos medis dar netikslus.</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Saugotojas</span>
              <select value={form.custodianId} onChange={(event) => update("custodianId", event.target.value)}>
                <option value="">Bendras tuntas</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Lokacija</span>
              <select value={form.locationId} onChange={(event) => update("locationId", event.target.value)}>
                <option value="">Nenurodyta</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.path ?? location.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field wide">
              <span>Atsakingas narys</span>
              <select value={form.responsibleUserId} onChange={(event) => update("responsibleUserId", event.target.value)}>
                <option value="">Nepriskirtas</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>{member.name} {member.surname}</option>
                ))}
              </select>
            </label>
            <label className="form-field wide">
              <span>Laikina saugojimo vieta</span>
              <input value={form.temporaryStorageLabel} onChange={(event) => update("temporaryStorageLabel", event.target.value)} />
            </label>
            <label className="form-field">
              <span>Pirkimo data</span>
              <input type="date" value={form.purchaseDate} onChange={(event) => update("purchaseDate", event.target.value)} />
            </label>
            <label className="form-field">
              <span>Pirkimo kaina</span>
              <input min="0" step="0.01" type="number" value={form.purchasePrice} onChange={(event) => update("purchasePrice", event.target.value)} />
            </label>
            <label className="form-field wide">
              <span>Pastabos</span>
              <textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
            </label>
          </div>
        </section>

        <div className="form-actions">
          <Link className="secondary-button" to={isEditing && itemId ? `/inventory/${itemId}` : "/inventory"}>Atšaukti</Link>
          <button className="primary-button compact-primary-button" type="submit" disabled={!canSubmit || isSubmitting}>
            <Save size={17} aria-hidden="true" />
            {isSubmitting ? "Saugoma..." : isEditing ? "Išsaugoti pakeitimus" : "Sukurti įrašą"}
          </button>
        </div>
      </form>
    </section>
  );
}

function toPayload(form: FormState): CreateItemRequest {
  return {
    name: form.name.trim(),
    description: optional(form.description),
    type: form.type,
    category: form.category.trim(),
    origin: "UNIT_ACQUIRED",
    quantity: Number(form.quantity),
    isConsumable: form.isConsumable,
    unitOfMeasure: form.unitOfMeasure.trim() || "vnt.",
    minimumQuantity: numberOrNull(form.minimumQuantity),
    condition: form.condition,
    custodianId: optional(form.custodianId),
    locationId: optional(form.locationId),
    responsibleUserId: optional(form.responsibleUserId),
    temporaryStorageLabel: optional(form.temporaryStorageLabel),
    purchaseDate: optional(form.purchaseDate),
    purchasePrice: numberOrNull(form.purchasePrice),
    notes: optional(form.notes),
    duplicateHandling: "ASK"
  };
}

function toUpdatePayload(form: FormState, originalItem: Item | null): UpdateItemRequest {
  return {
    ...toPayload(form),
    status: form.status,
    clearCustodianId: Boolean(originalItem?.custodianId && !form.custodianId),
    clearLocationId: Boolean(originalItem?.locationId && !form.locationId),
    clearResponsibleUserId: Boolean(originalItem?.responsibleUserId && !form.responsibleUserId),
    clearMinimumQuantity: Boolean(originalItem?.minimumQuantity != null && !form.minimumQuantity.trim())
  };
}

function fromItem(item: Item): FormState {
  return {
    name: item.name,
    description: item.description ?? "",
    type: item.type,
    category: item.category,
    condition: item.condition,
    quantity: String(item.quantity),
    unitOfMeasure: item.unitOfMeasure ?? "vnt.",
    minimumQuantity: item.minimumQuantity == null ? "" : String(item.minimumQuantity),
    isConsumable: Boolean(item.isConsumable),
    custodianId: item.custodianId ?? "",
    locationId: item.locationId ?? "",
    responsibleUserId: item.responsibleUserId ?? "",
    temporaryStorageLabel: item.temporaryStorageLabel ?? "",
    purchaseDate: dateInputValue(item.purchaseDate),
    purchasePrice: item.purchasePrice == null ? "" : String(item.purchasePrice),
    notes: item.notes ?? "",
    status: item.status
  };
}

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
