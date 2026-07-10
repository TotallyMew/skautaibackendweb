import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, Loader2, MapPinned, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { Location } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  SkautaiConfirmDialog,
  SkautaiDataTable,
  SkautaiEmptyState,
  SkautaiErrorState,
  SkautaiPageShell,
  SkautaiPanel,
  SkautaiStatusPill,
  type SkautaiDataTableColumn
} from "../components/ui/Skautai";
import { hasPermission } from "../utils/permissions";

type LocationForm = {
  name: string;
  visibility: string;
  parentLocationId: string;
  address: string;
  description: string;
};

type LocationTreeRow = {
  location: Location;
  depth: number;
  parentName?: string;
};

const emptyForm: LocationForm = {
  name: "",
  visibility: "PUBLIC",
  parentLocationId: "",
  address: "",
  description: ""
};

const rootLocationKey = "__root__";

export function LocationsPage() {
  const { auth } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
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

    api.listLocations(auth.token, auth.activeTuntasId)
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

  const sortedLocations = useMemo(() => [...locations].sort(compareLocations), [locations]);
  const locationRows = useMemo(() => buildLocationTreeRows(locations), [locations]);

  function openCreatePanel() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
    setIsEditorOpen(true);
  }

  function openEditPanel(location: Location) {
    if (!canManageLocations || !location.isEditable) return;
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
    setIsEditorOpen(true);
  }

  function closeEditor() {
    if (isSaving) return;
    setIsEditorOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !canManageLocations) return;
    if (!form.name.trim()) {
      setError("Įveskite lokacijos pavadinimą.");
      return;
    }

    const wasEditing = Boolean(editingId);
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
      setLocations((current) => wasEditing
        ? current.map((location) => location.id === saved.id ? saved : location)
        : [...current, saved]);
      setIsEditorOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setMessage(wasEditing ? "Lokacija atnaujinta." : "Lokacija sukurta.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Lokacijos išsaugoti nepavyko.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeLocation() {
    const location = locationToDelete;
    if (!location || !auth?.token || !auth.activeTuntasId || !canManageLocations) return;
    setBusyId(location.id);
    setError(null);
    setMessage(null);
    try {
      await api.deleteLocation(auth.token, auth.activeTuntasId, location.id);
      setLocations((current) => current.filter((item) => item.id !== location.id));
      if (editingId === location.id) {
        setIsEditorOpen(false);
        setEditingId(null);
        setForm(emptyForm);
      }
      setLocationToDelete(null);
      setMessage("Lokacija ištrinta.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Lokacijos ištrinti nepavyko.");
    } finally {
      setBusyId(null);
    }
  }

  const actions = (
    <>
      <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading}>
        <RefreshCw size={17} aria-hidden="true" />
        Atnaujinti
      </button>
      {canManageLocations && (
        <button className="primary-button compact-primary-button" type="button" onClick={openCreatePanel}>
          <Plus size={17} aria-hidden="true" />
          Nauja vieta
        </button>
      )}
    </>
  );

  return (
    <SkautaiPageShell className="locations-page" eyebrow="Inventorius" title="Lokacijos" actions={actions}>
      <p className="locations-page-description">
        Tvarkyk hierarchinę sandėlių, patalpų ir kitų inventoriaus vietų struktūrą.
      </p>

      {message && <p className="inline-success">{message}</p>}
      {error && <SkautaiErrorState description={error} />}

      <section className="data-panel locations-table-panel" aria-label="Lokacijų sąrašas">
        <div className="data-panel-header">
          <span>{locationRows.length} {locationRows.length === 1 ? "lokacija" : "lokacijos"}</span>
          <span>Hierarchinė struktūra</span>
        </div>

        {isLoading && locations.length === 0 ? (
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunamos lokacijos...
          </div>
        ) : locationRows.length === 0 ? (
          <SkautaiEmptyState compact icon={MapPinned} title="Lokacijų dar nėra" description="Sukurk pirmą vietą ir vėliau pridėk jai žemesnio lygmens lokacijas." />
        ) : (
          <LocationsTable rows={locationRows} canManageLocations={canManageLocations} busyId={busyId} onEdit={openEditPanel} onDelete={setLocationToDelete} />
        )}
      </section>

      <SkautaiPanel
        open={isEditorOpen}
        title={editingId ? "Redaguoti lokaciją" : "Nauja vieta"}
        description="Nurodyk vietos tipą, tėvinę lokaciją ir papildomą informaciją."
        onClose={closeEditor}
      >
        <form className="form-panel location-editor-form" onSubmit={submit}>
          <fieldset disabled={isSaving}>
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
                  <option value="">Aukščiausias lygmuo</option>
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
              <button className="secondary-button" type="button" onClick={closeEditor}>Atšaukti</button>
            </div>
          </fieldset>
        </form>
      </SkautaiPanel>

      <SkautaiConfirmDialog
        open={Boolean(locationToDelete)}
        title="Ištrinti lokaciją?"
        description={locationToDelete ? `Lokacija „${locationToDelete.name}“ bus pašalinta. Lokacijos su vaikais arba priskirtu inventoriumi gali būti apsaugotos nuo ištrynimo.` : undefined}
        confirmLabel="Ištrinti"
        isBusy={Boolean(locationToDelete && busyId === locationToDelete.id)}
        onConfirm={() => void removeLocation()}
        onCancel={() => {
          if (!busyId) setLocationToDelete(null);
        }}
      />
    </SkautaiPageShell>
  );
}

function LocationsTable({
  rows,
  canManageLocations,
  busyId,
  onEdit,
  onDelete
}: {
  rows: LocationTreeRow[];
  canManageLocations: boolean;
  busyId: string | null;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
}) {
  const columns: Array<SkautaiDataTableColumn<LocationTreeRow>> = [
    {
      key: "location",
      header: "Lokacija",
      cell: ({ location, depth }) => (
        <div className="location-tree-cell" style={{ paddingInlineStart: `${depth * 20}px` }} title={location.fullPath}>
          <MapPinned className="location-tree-icon" size={17} aria-hidden="true" />
          <div className="location-tree-copy">
            <strong>{location.name}</strong>
            {location.description && <span>{location.description}</span>}
          </div>
        </div>
      )
    },
    {
      key: "visibility",
      header: "Tipas",
      cell: ({ location }) => (
        <SkautaiStatusPill tone={visibilityTone(location.visibility)}>
          {visibilityLabel(location.visibility)}
        </SkautaiStatusPill>
      )
    },
    {
      key: "context",
      header: "Kontekstas",
      cell: ({ location, parentName }) => (
        <div className="location-context-cell">
          <strong>{parentName ?? "Aukščiausias lygmuo"}</strong>
          {location.ownerUnitName && <span>{location.ownerUnitName}</span>}
        </div>
      )
    },
    {
      key: "address",
      header: "Adresas",
      cell: ({ location }) => <span className="location-address-cell">{location.address || "—"}</span>
    },
    {
      key: "actions",
      header: "",
      mobileLabel: "Veiksmai",
      className: "table-actions-cell",
      cell: ({ location }) => canManageLocations && location.isEditable ? (
        <div className="row-actions">
          <button className="icon-button" type="button" title="Redaguoti" aria-label={`Redaguoti ${location.name}`} onClick={() => onEdit(location)}>
            <Edit3 size={17} aria-hidden="true" />
          </button>
          <button className="icon-button danger-icon-button" type="button" title="Ištrinti" aria-label={`Ištrinti ${location.name}`} disabled={busyId === location.id} onClick={() => onDelete(location)}>
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      ) : null
    }
  ];

  return (
    <SkautaiDataTable
      className="locations-data-table"
      rows={rows}
      columns={columns}
      getRowKey={({ location }) => location.id}
      getRowClassName={({ depth }) => `location-tree-row location-tree-depth-${Math.min(depth, 6)}`}
    />
  );
}

function buildLocationTreeRows(locations: Location[]): LocationTreeRow[] {
  const locationIds = new Set(locations.map((location) => location.id));
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const childrenByParent = new Map<string, Location[]>();

  locations.forEach((location) => {
    const parentKey = location.parentLocationId && locationIds.has(location.parentLocationId)
      ? location.parentLocationId
      : rootLocationKey;
    const children = childrenByParent.get(parentKey) ?? [];
    children.push(location);
    childrenByParent.set(parentKey, children);
  });

  childrenByParent.forEach((children) => children.sort(compareLocations));
  const rows: LocationTreeRow[] = [];
  const visited = new Set<string>();

  function appendLocation(location: Location, depth: number) {
    if (visited.has(location.id)) return;
    visited.add(location.id);
    rows.push({
      location,
      depth,
      parentName: location.parentLocationId ? locationsById.get(location.parentLocationId)?.name : undefined
    });
    (childrenByParent.get(location.id) ?? []).forEach((child) => appendLocation(child, depth + 1));
  }

  (childrenByParent.get(rootLocationKey) ?? []).forEach((location) => appendLocation(location, 0));
  [...locations].sort(compareLocations).forEach((location) => appendLocation(location, 0));
  return rows;
}

function compareLocations(left: Location, right: Location) {
  return left.name.localeCompare(right.name, "lt") || left.fullPath.localeCompare(right.fullPath, "lt");
}

function TextField({
  label,
  value,
  onChange,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
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

function visibilityTone(value: string): "success" | "info" | "muted" {
  if (value === "PUBLIC") return "success";
  if (value === "UNIT") return "info";
  return "muted";
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
