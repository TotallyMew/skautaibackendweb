import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, PackagePlus, Save } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { CreateItemRequest } from "../api/types";
import { useAuth } from "../auth/AuthProvider";

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
  temporaryStorageLabel: string;
  purchaseDate: string;
  purchasePrice: string;
  notes: string;
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
  temporaryStorageLabel: "",
  purchaseDate: "",
  purchasePrice: "",
  notes: ""
};

export function InventoryCreatePage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(auth?.token && auth.activeTuntasId && form.name.trim() && form.category.trim() && Number(form.quantity) > 0);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId) return;

    const payload = toPayload(form);
    if (!payload.name || !payload.category || payload.quantity <= 0) {
      setError("Užpildyk pavadinimą, kategoriją ir teigiamą kiekį.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const item = await api.createItem(auth.token, auth.activeTuntasId, payload);
      navigate(`/inventory/${item.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Nepavyko sukurti inventoriaus įrašo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/inventory">
            <ArrowLeft size={17} aria-hidden="true" />
            Grįžti į inventorių
          </Link>
          <h2>Naujas inventoriaus įrašas</h2>
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
              <input min="1" type="number" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required />
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
          <Link className="secondary-button" to="/inventory">Atšaukti</Link>
          <button className="primary-button compact-primary-button" type="submit" disabled={!canSubmit || isSubmitting}>
            <Save size={17} aria-hidden="true" />
            {isSubmitting ? "Saugoma..." : "Sukurti įrašą"}
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
    temporaryStorageLabel: optional(form.temporaryStorageLabel),
    purchaseDate: optional(form.purchaseDate),
    purchasePrice: numberOrNull(form.purchasePrice),
    notes: optional(form.notes),
    duplicateHandling: "ASK"
  };
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
