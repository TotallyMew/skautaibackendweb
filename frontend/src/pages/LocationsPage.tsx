import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, Loader2, MapPinned, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { Location } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { hasPermission } from "../utils/permissions";

type LocationForm = {
  name: string;
  visibility: string;
  parentLocationId: string;
  address: string;
  description: string;
};

const emptyForm: LocationForm = {
  name: "",
  visibility: "PUBLIC",
  parentLocationId: "",
  address: "",
  description: ""
};

export function LocationsPage() {
  const { auth } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManageLocations = hasPermission(auth?.permissions, "locations.manage");

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) return;
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .listLocations(auth.token, auth.activeTuntasId)
      .then((response) => {
        if (!isCancelled) setLocations(response.locations);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Lokacijų užkrauti nepavyko.");
          setLocations([]);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, reloadKey]);

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.fullPath.localeCompare(b.fullPath, "lt")),
    [locations]
  );
  const editableLocation = editingId ? locations.find((location) => location.id === editingId) : null;

  function startEdit(location: Location) {
    setEditingId(location.id);
    setForm({
      name: location.name,
      visibility: location.visibility,
      parentLocationId: location.parentLocationId ?? "",
      address: location.address ?? "",
      description: location.description ?? ""
    });
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId) return;
    if (!form.name.trim()) return setError("Įveskite lokacijos pavadinimą.");

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        name: form.name.trim(),
        visibility: form.visibility,
        parentLocationId: optional(form.parentLocationId),
        address: optional(form.address),
        description: optional(form.description)
      };
      const saved = editingId
        ? await api.updateLocation(auth.token, auth.activeTuntasId, editingId, body)
        : await api.createLocation(auth.token, auth.activeTuntasId, body);
      setLocations((current) => editingId
        ? current.map((location) => location.id === saved.id ? saved : location)
        : [...current, saved]);
      resetForm();
      setMessage(editingId ? "Lokacija atnaujinta." : "Lokacija sukurta.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Lokacijos išsaugoti nepavyko.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeLocation(location: Location) {
    if (!auth?.token || !auth.activeTuntasId) return;
    if (!window.confirm(`Ištrinti lokaciją "${location.name}"?`)) return;
    setBusyId(location.id);
    setError(null);
    setMessage(null);
    try {
      await api.deleteLocation(auth.token, auth.activeTuntasId, location.id);
      setLocations((current) => current.filter((item) => item.id !== location.id));
      if (editingId === location.id) resetForm();
      setMessage("Lokacija ištrinta.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Lokacijos ištrinti nepavyko.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="locations-page">
      <div className="page-heading-row">
        <div>
          <span className="section-kicker">INVENTORIUS</span>
          <h2>Lokacijos</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading}>
          <RefreshCw size={17} aria-hidden="true" />
          Atnaujinti
        </button>
      </div>

      {message && <p className="inline-success">{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="inner-page-grid">
        <section className="data-panel">
          <div className="record-header location-row">
            <span>LOKACIJA</span>
            <span>TIPAS</span>
            <span>ADRESAS</span>
            <span></span>
          </div>
          {isLoading && locations.length === 0 ? (
            <div className="empty-state compact-empty-state">
              <Loader2 className="spin-icon" size={28} aria-hidden="true" />
              <strong>Kraunamos lokacijos</strong>
            </div>
          ) : sortedLocations.length === 0 ? (
            <div className="empty-state compact-empty-state">
              <MapPinned size={28} aria-hidden="true" />
              <strong>Lokacijų dar nėra</strong>
              <span>Sukurk sandėlius, kambarius ar lentynas, kad inventorių būtų lengviau rasti.</span>
            </div>
          ) : (
            <div className="record-list">
              {sortedLocations.map((location) => (
                <article className="record-row location-row" key={location.id}>
                  <div>
                    <strong className="record-title">{location.name}</strong>
                    <span>{location.fullPath}</span>
                    {location.ownerUnitName && <span className="muted-line">{location.ownerUnitName}</span>}
                  </div>
                  <span className="mini-chip">{visibilityLabel(location.visibility)}</span>
                  <span>{location.address || "Nenurodyta"}</span>
                  <div className="row-actions">
                    {canManageLocations && location.isEditable && (
                      <>
                        <button className="icon-button" type="button" title="Redaguoti" onClick={() => startEdit(location)}>
                          <Edit3 size={17} aria-hidden="true" />
                        </button>
                        <button className="icon-button danger-icon-button" type="button" title="Ištrinti" disabled={busyId === location.id} onClick={() => void removeLocation(location)}>
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="form-panel">
          <form className="form-section" onSubmit={submit}>
            <div className="form-section-heading">
              <Plus size={20} aria-hidden="true" />
              <div>
                <h3>{editingId ? "Redaguoti lokaciją" : "Nauja lokacija"}</h3>
                <span>{canManageLocations ? "Lokacijos naudojamos inventoriaus vietai ir laikino sandėliavimo žymoms." : "Lokacijas gali keisti tik tam teisę turintys vadovai."}</span>
              </div>
            </div>
            <fieldset disabled={!canManageLocations || isSaving}>
              <div className="form-grid one-column-grid">
                <TextField label="Pavadinimas *" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
                <label className="form-field">
                  <span>Tipas</span>
                  <select value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))}>
                    <option value="PUBLIC">Vieša</option>
                    <option value="UNIT">Padalinio</option>
                    <option value="PRIVATE">Privati</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Tėvinė lokacija</span>
                  <select value={form.parentLocationId} onChange={(event) => setForm((current) => ({ ...current, parentLocationId: event.target.value }))}>
                    <option value="">Be tėvinės lokacijos</option>
                    {sortedLocations.filter((location) => location.id !== editingId).map((location) => (
                      <option key={location.id} value={location.id}>{location.fullPath}</option>
                    ))}
                  </select>
                </label>
                <TextField label="Adresas" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
                <label className="form-field">
                  <span>Aprašymas</span>
                  <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                </label>
              </div>
              <div className="form-actions">
                <button className="primary-button compact-primary-button" type="submit">
                  {isSaving ? "Saugoma..." : editingId ? "Išsaugoti" : "Sukurti"}
                </button>
                {editingId && (
                  <button className="secondary-button" type="button" onClick={resetForm}>
                    Atšaukti
                  </button>
                )}
              </div>
            </fieldset>
            {editableLocation && !editableLocation.isEditable && <p className="error-text">Šios lokacijos redaguoti negalima.</p>}
          </form>
        </aside>
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function visibilityLabel(value: string) {
  const labels: Record<string, string> = {
    PUBLIC: "Vieša",
    UNIT: "Padalinio",
    PRIVATE: "Privati"
  };
  return labels[value] ?? value;
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
