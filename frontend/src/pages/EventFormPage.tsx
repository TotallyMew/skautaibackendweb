import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarPlus, Save, ShieldCheck } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { Location, OrganizationalUnit } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { eventTypeLabel } from "../utils/display";
import { hasPermission } from "../utils/permissions";

type EventFormState = {
  name: string;
  type: string;
  customTypeLabel: string;
  startDate: string;
  endDate: string;
  locationId: string;
  organizationalUnitId: string;
  notes: string;
};

const initialForm: EventFormState = {
  name: "",
  type: "STOVYKLA",
  customTypeLabel: "",
  startDate: todayInputValue(),
  endDate: todayInputValue(),
  locationId: "",
  organizationalUnitId: "",
  notes: ""
};

const eventTypes = ["STOVYKLA", "SUEIGA", "RENGINYS"];

export function EventFormPage() {
  const { eventId } = useParams();
  const isEditing = Boolean(eventId);
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<EventFormState>(initialForm);
  const [locations, setLocations] = useState<Location[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEditEvent, setCanEditEvent] = useState<boolean | null>(isEditing ? null : true);

  const canCreate = hasPermission(auth?.permissions, "events.create");
  const canLoad = isEditing || canCreate;
  const hasAccess = isEditing ? canEditEvent === true : canCreate;

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canLoad) return;
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      isEditing && eventId ? api.getEvent(auth.token, auth.activeTuntasId, eventId) : Promise.resolve(null),
      api.listLocations(auth.token, auth.activeTuntasId).catch(() => ({ locations: [], total: 0 })),
      api.listOrganizationalUnits(auth.token, auth.activeTuntasId).catch(() => ({ units: [], total: 0 }))
    ])
      .then(([event, locationResponse, unitResponse]) => {
        if (isCancelled) return;
        setLocations(locationResponse.locations);
        setUnits(unitResponse.units);
        if (event) {
          setCanEditEvent(event.capabilities?.canManage ?? false);
          setForm({
            name: event.name,
            type: event.type,
            customTypeLabel: event.customTypeLabel ?? "",
            startDate: dateInputValue(event.startDate),
            endDate: dateInputValue(event.endDate),
            locationId: event.locationId ?? "",
            organizationalUnitId: event.organizationalUnitId ?? "",
            notes: event.notes ?? ""
          });
        }
      })
      .catch((cause) => {
        if (!isCancelled) setError(cause instanceof Error ? cause.message : "Renginio duomenų užkrauti nepavyko.");
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, auth?.userId, canLoad, eventId, isEditing]);

  const sortedLocations = useMemo(
    () => [...locations].filter((location) => location.isLeafSelectable).sort((left, right) => left.fullPath.localeCompare(right.fullPath, "lt")),
    [locations]
  );

  const sortedUnits = useMemo(
    () => [...units].sort((left, right) => left.name.localeCompare(right.name, "lt")),
    [units]
  );

  function update<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !hasAccess) return;
    if (!form.name.trim()) return setError("Įveskite renginio pavadinimą.");
    if (form.endDate < form.startDate) return setError("Pabaigos data negali būti ankstesnė už pradžios datą.");

    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        customTypeLabel: optional(form.customTypeLabel),
        startDate: form.startDate,
        endDate: form.endDate,
        locationId: optional(form.locationId),
        organizationalUnitId: optional(form.organizationalUnitId),
        notes: optional(form.notes),
        ...(isEditing ? {
          clearLocationId: !form.locationId,
          clearOrganizationalUnitId: !form.organizationalUnitId,
          clearNotes: !form.notes.trim()
        } : {})
      };
      const saved = isEditing && eventId
        ? await api.updateEvent(auth.token, auth.activeTuntasId, eventId, payload)
        : await api.createEvent(auth.token, auth.activeTuntasId, payload);
      navigate(`/events/${saved.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Renginio išsaugoti nepavyko.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canLoad || (isEditing && canEditEvent === false)) {
    return (
      <section className="work-area">
        <ShieldCheck size={34} aria-hidden="true" />
        <div>
          <h2>{isEditing ? "Renginio redagavimui reikia teisės" : "Renginio kūrimui reikia teisės"}</h2>
          <p>Web ekranas seka tą pačią prieigos logiką kaip Android programėlė.</p>
          <Link className="secondary-button" to="/events">Grįžti į renginius</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to={isEditing && eventId ? `/events/${eventId}` : "/events"}>
            <ArrowLeft size={17} aria-hidden="true" />
            {isEditing ? "Grįžti į renginį" : "Grįžti į renginius"}
          </Link>
          <h2>{isEditing ? "Redaguoti renginį" : "Naujas renginys"}</h2>
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
              <h3>Pagrindinė informacija</h3>
              <span>{isLoading ? "Kraunami renginio duomenys..." : "Pavadinimas, tipas, datos ir organizacinis kontekstas."}</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field wide">
              <span>Pavadinimas *</span>
              <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Tipas</span>
              <select value={form.type} onChange={(event) => update("type", event.target.value)}>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>{eventTypeLabel(type)}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Kito tipo pavadinimas</span>
              <input value={form.customTypeLabel} onChange={(event) => update("customTypeLabel", event.target.value)} placeholder="Pvz. žygis" />
            </label>
            <label className="form-field">
              <span>Pradžia</span>
              <input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Pabaiga</span>
              <input type="date" value={form.endDate} onChange={(event) => update("endDate", event.target.value)} required />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <CalendarPlus size={20} aria-hidden="true" />
            <div>
              <h3>Vieta ir vienetas</h3>
              <span>Lokacija ir vienetas padeda vėliau planuoti inventorių, pastovykles ir atsakomybes.</span>
            </div>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>Lokacija</span>
              <select value={form.locationId} onChange={(event) => update("locationId", event.target.value)}>
                <option value="">Nenurodyta</option>
                {sortedLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.fullPath}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Organizuojantis vienetas</span>
              <select value={form.organizationalUnitId} onChange={(event) => update("organizationalUnitId", event.target.value)}>
                <option value="">Tunto lygmuo</option>
                {sortedUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field wide">
              <span>Pastabos</span>
              <textarea rows={4} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
            </label>
          </div>
        </section>

        <div className="form-actions">
          <Link className="secondary-button" to={isEditing && eventId ? `/events/${eventId}` : "/events"}>Atšaukti</Link>
          <button className="primary-button compact-primary-button" type="submit" disabled={isSubmitting || isLoading}>
            <Save size={17} aria-hidden="true" />
            {isSubmitting ? "Saugoma..." : isEditing ? "Išsaugoti" : "Sukurti renginį"}
          </button>
        </div>
      </form>
    </section>
  );
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}
