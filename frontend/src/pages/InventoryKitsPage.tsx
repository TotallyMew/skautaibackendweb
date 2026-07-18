import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, Layers3, Loader2, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type {
  InventoryKit,
  InventoryKitItemRequest,
  Item,
  Location,
  Member,
  OrganizationalUnit
} from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  SkautaiConfirmDialog,
  SkautaiDataTable,
  SkautaiEmptyState,
  SkautaiErrorState,
  SkautaiFormSection,
  SkautaiPageShell,
  SkautaiPanel,
  SkautaiStatusPill,
  SkautaiTabs,
  type SkautaiDataTableColumn
} from "../components/ui/Skautai";
import { countLabel } from "../utils/display";
import { hasPermission } from "../utils/permissions";

type KitStatusFilter = "ACTIVE" | "INACTIVE";

type KitItemDraft = {
  rowId: string;
  itemId: string;
  quantity: string;
};

type KitForm = {
  name: string;
  description: string;
  custodianId: string;
  locationId: string;
  temporaryStorageLabel: string;
  responsibleUserId: string;
  items: KitItemDraft[];
};

let nextDraftRowId = 0;

function emptyKitForm(): KitForm {
  return {
    name: "",
    description: "",
    custodianId: "",
    locationId: "",
    temporaryStorageLabel: "",
    responsibleUserId: "",
    items: []
  };
}

function newItemDraft(itemId = "", quantity = 1, rowId?: string): KitItemDraft {
  nextDraftRowId += 1;
  return {
    rowId: rowId ?? `kit-item-${nextDraftRowId}`,
    itemId,
    quantity: String(quantity)
  };
}

export function InventoryKitsPage() {
  const { auth } = useAuth();
  const [kits, setKits] = useState<InventoryKit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [statusFilter, setStatusFilter] = useState<KitStatusFilter>("ACTIVE");
  const [form, setForm] = useState<KitForm>(emptyKitForm);
  const [editingKit, setEditingKit] = useState<InventoryKit | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyKitId, setBusyKitId] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<InventoryKit | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const permissions = auth?.permissions;
  const canView = hasPermission(permissions, "items.view");
  const canCreate = hasPermission(permissions, "items.create");
  const canUpdate = hasPermission(permissions, "items.update");
  const canDeactivate = hasPermission(permissions, "items.delete");
  const canListUnits = hasPermission(permissions, "organizational_units.view");
  const canListMembers = hasPermission(permissions, "members.view");

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canView) {
      setKits([]);
      setItems([]);
      setLocations([]);
      setUnits([]);
      setMembers([]);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.listInventoryKits(auth.token, auth.activeTuntasId, true),
      fetchAllActiveItems(auth.token, auth.activeTuntasId).catch(() => []),
      api.listLocations(auth.token, auth.activeTuntasId).then((response) => response.locations).catch(() => []),
      canListUnits
        ? api.listOrganizationalUnits(auth.token, auth.activeTuntasId).then((response) => response.units).catch(() => [])
        : Promise.resolve([] as OrganizationalUnit[]),
      canListMembers
        ? api.listMembers(auth.token, auth.activeTuntasId).then((response) => response.members).catch(() => [])
        : Promise.resolve([] as Member[])
    ])
      .then(([kitResponse, itemResponse, locationResponse, unitResponse, memberResponse]) => {
        if (isCancelled) return;
        setKits(kitResponse.kits);
        setItems(itemResponse);
        setLocations(locationResponse);
        setUnits(unitResponse);
        setMembers(memberResponse);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(errorMessage(cause, "Komplektų įkelti nepavyko."));
          setKits([]);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, canListMembers, canListUnits, canView, reloadKey]);

  const visibleKits = useMemo(
    () => kits
      .filter((kit) => kit.status === statusFilter)
      .sort((left, right) => left.name.localeCompare(right.name, "lt")),
    [kits, statusFilter]
  );
  const activeCount = kits.filter((kit) => kit.status === "ACTIVE").length;
  const inactiveCount = kits.filter((kit) => kit.status === "INACTIVE").length;
  const sortedLocations = useMemo(
    () => [...locations].sort((left, right) => left.fullPath.localeCompare(right.fullPath, "lt")),
    [locations]
  );
  const sortedUnits = useMemo(
    () => [...units].sort((left, right) => left.name.localeCompare(right.name, "lt")),
    [units]
  );
  const sortedMembers = useMemo(
    () => [...members].sort((left, right) => memberName(left).localeCompare(memberName(right), "lt")),
    [members]
  );

  const scopeItems = useMemo(() => {
    return items
      .filter((item) => item.status === "ACTIVE")
      .filter((item) => form.custodianId ? item.custodianId === form.custodianId : !item.custodianId)
      .filter((item) => !item.kitId || item.kitId === editingKit?.id)
      .sort((left, right) => left.name.localeCompare(right.name, "lt"));
  }, [editingKit?.id, form.custodianId, items]);

  function openCreate() {
    setEditingKit(null);
    setForm(emptyKitForm());
    setMessage(null);
    setError(null);
    setIsFormOpen(true);
  }

  function openEdit(kit: InventoryKit) {
    setEditingKit(kit);
    setForm({
      name: kit.name,
      description: kit.description ?? "",
      custodianId: kit.custodianId ?? "",
      locationId: kit.locationId ?? "",
      temporaryStorageLabel: kit.temporaryStorageLabel ?? "",
      responsibleUserId: kit.responsibleUserId ?? "",
      items: kit.items.map((item) => newItemDraft(item.itemId, item.quantity, item.id))
    });
    setMessage(null);
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingKit(null);
    setForm(emptyKitForm());
  }

  function changeCustodian(custodianId: string) {
    setForm((current) => ({
      ...current,
      custodianId,
      items: current.custodianId === custodianId ? current.items : []
    }));
  }

  function addItemRow() {
    setForm((current) => ({ ...current, items: [...current.items, newItemDraft()] }));
  }

  function updateItemRow(rowId: string, patch: Partial<KitItemDraft>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((row) => row.rowId === rowId ? { ...row, ...patch } : row)
    }));
  }

  function removeItemRow(rowId: string) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((row) => row.rowId !== rowId)
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId) return;
    if (editingKit ? !canUpdate : !canCreate) return;

    const name = form.name.trim();
    if (!name) return setError("Įveskite komplekto pavadinimą.");

    const selectedRows = form.items.filter((row) => row.itemId);
    const selectedIds = selectedRows.map((row) => row.itemId);
    if (new Set(selectedIds).size !== selectedIds.length) {
      return setError("Tas pats inventoriaus įrašas komplekte gali būti pasirinktas tik vieną kartą.");
    }

    const kitItems: InventoryKitItemRequest[] = [];
    for (const row of selectedRows) {
      const quantity = Number(row.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return setError("Kiekvieno komplekto daikto kiekis turi būti teigiamas sveikasis skaičius.");
      }
      const sourceItem = items.find((item) => item.id === row.itemId);
      if (sourceItem && quantity > sourceItem.quantity) {
        return setError(`Komplektui negalima skirti daugiau nei ${sourceItem.quantity} vnt. „${sourceItem.name}“.`);
      }
      if (sourceItem && (sourceItem.custodianId ?? "") !== form.custodianId) {
        return setError("Visi komplekto daiktai turi priklausyti tam pačiam saugotojui kaip komplektas.");
      }
      kitItems.push({ itemId: row.itemId, quantity });
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const commonBody = {
        name,
        description: optional(form.description),
        custodianId: optional(form.custodianId),
        locationId: optional(form.locationId),
        temporaryStorageLabel: optional(form.temporaryStorageLabel),
        responsibleUserId: optional(form.responsibleUserId),
        items: kitItems
      };
      const saved = editingKit
        ? await api.updateInventoryKit(auth.token, auth.activeTuntasId, editingKit.id, {
          ...commonBody,
          clearLocationId: !form.locationId,
          clearResponsibleUserId: !form.responsibleUserId
        })
        : await api.createInventoryKit(auth.token, auth.activeTuntasId, commonBody);

      setKits((current) => editingKit
        ? current.map((kit) => kit.id === saved.id ? saved : kit)
        : [...current, saved]);
      setStatusFilter(saved.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
      setMessage(editingKit ? "Komplektas atnaujintas." : "Komplektas sukurtas.");
      closeFormAfterSave();
    } catch (cause) {
      setError(errorMessage(cause, "Komplekto išsaugoti nepavyko."));
    } finally {
      setIsSaving(false);
    }
  }

  function closeFormAfterSave() {
    setIsFormOpen(false);
    setEditingKit(null);
    setForm(emptyKitForm());
  }

  async function deactivateKit() {
    if (!pendingDeactivate || !auth?.token || !auth.activeTuntasId || !canDeactivate) return;
    const kit = pendingDeactivate;
    setBusyKitId(kit.id);
    setError(null);
    setMessage(null);
    try {
      await api.deleteInventoryKit(auth.token, auth.activeTuntasId, kit.id);
      setKits((current) => current.map((item) => item.id === kit.id
        ? { ...item, status: "INACTIVE", items: [] }
        : item));
      setMessage("Komplektas išaktyvintas.");
      setPendingDeactivate(null);
    } catch (cause) {
      setError(errorMessage(cause, "Komplekto išaktyvinti nepavyko."));
    } finally {
      setBusyKitId(null);
    }
  }

  async function reactivateKit(kit: InventoryKit) {
    if (!auth?.token || !auth.activeTuntasId || !canUpdate) return;
    setBusyKitId(kit.id);
    setError(null);
    setMessage(null);
    try {
      const saved = await api.updateInventoryKit(auth.token, auth.activeTuntasId, kit.id, { status: "ACTIVE" });
      setKits((current) => current.map((item) => item.id === saved.id ? saved : item));
      setMessage("Komplektas vėl aktyvus. Jei reikia, pridėkite jo daiktus redagavimo formoje.");
    } catch (cause) {
      setError(errorMessage(cause, "Komplekto aktyvuoti nepavyko."));
    } finally {
      setBusyKitId(null);
    }
  }

  const actions = (
    <>
      {canCreate && (
        <button className="primary-button compact-primary-button" type="button" onClick={openCreate}>
          <Plus size={17} aria-hidden="true" />
          Naujas komplektas
        </button>
      )}
      <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading || !canView}>
        <RefreshCw size={17} aria-hidden="true" />
        Atnaujinti
      </button>
    </>
  );

  const columns: Array<SkautaiDataTableColumn<InventoryKit>> = [
    {
      key: "kit",
      header: "Komplektas",
      cell: (kit) => (
        <div className="table-title-cell">
          <span className="record-icon table-cell-icon"><Layers3 size={18} aria-hidden="true" /></span>
          <div>
            <strong>{kit.name}</strong>
            <span>{kit.description || "Aprašymo nėra"}</span>
          </div>
        </div>
      )
    },
    {
      key: "storage",
      header: "Saugojimas",
      cell: (kit) => (
        <>
          <strong>{kit.custodianName ?? "Bendras tuntas"}</strong>
          <span>{kit.locationPath ?? kit.locationName ?? kit.temporaryStorageLabel ?? "Vieta nenurodyta"}</span>
        </>
      )
    },
    {
      key: "items",
      header: "Daiktai",
      cell: (kit) => (
        <>
          <strong>{kit.items.length} {countLabel(kit.items.length, "įrašas", "įrašai", "įrašų")}</strong>
          {kit.items.slice(0, 3).map((item) => (
            <Link className="table-link" key={item.id} to={`/inventory/${item.itemId}`}>
              {item.itemName} ({item.quantity})
            </Link>
          ))}
          {kit.items.length > 3 && <span>ir dar {kit.items.length - 3}</span>}
        </>
      )
    },
    {
      key: "responsible",
      header: "Atsakingas",
      cell: (kit) => <span>{kit.responsibleUserName ?? "Nepriskirtas"}</span>
    },
    {
      key: "status",
      header: "Būsena",
      cell: (kit) => (
        <SkautaiStatusPill status={kit.status} tone={kit.status === "ACTIVE" ? "success" : "muted"}>
          {kit.status === "ACTIVE" ? "Aktyvus" : "Neaktyvus"}
        </SkautaiStatusPill>
      )
    },
    {
      key: "actions",
      header: "",
      className: "table-actions-cell",
      cell: (kit) => (
        <div className="row-actions">
          {canUpdate && (
            <button className="icon-button" type="button" title="Redaguoti komplektą" aria-label={`Redaguoti komplektą ${kit.name}`} onClick={() => openEdit(kit)}>
              <Edit3 size={17} aria-hidden="true" />
            </button>
          )}
          {kit.status === "ACTIVE" && canDeactivate && (
            <button className="icon-button danger-icon-button" type="button" title="Išaktyvinti komplektą" aria-label={`Išaktyvinti komplektą ${kit.name}`} disabled={busyKitId === kit.id} onClick={() => setPendingDeactivate(kit)}>
              <Trash2 size={17} aria-hidden="true" />
            </button>
          )}
          {kit.status === "INACTIVE" && canUpdate && (
            <button className="icon-button" type="button" title="Aktyvuoti komplektą" aria-label={`Aktyvuoti komplektą ${kit.name}`} disabled={busyKitId === kit.id} onClick={() => void reactivateKit(kit)}>
              <RotateCcw size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <SkautaiPageShell className="inventory-page" eyebrow="Inventorius" title="Komplektai" actions={actions}>
      {message && <p className="inline-success">{message}</p>}
      {error && <SkautaiErrorState description={error} />}

      {!canView ? (
        <SkautaiEmptyState
          icon={Layers3}
          title="Komplektai nepasiekiami"
          description="Komplektams peržiūrėti reikia inventoriaus peržiūros teisės."
        />
      ) : (
        <>
          <SkautaiTabs
            label="Komplektų būsena"
            activeTab={statusFilter}
            onChange={(value) => setStatusFilter(value as KitStatusFilter)}
            tabs={[
              { id: "ACTIVE", label: "Aktyvūs", count: activeCount },
              { id: "INACTIVE", label: "Neaktyvūs", count: inactiveCount }
            ]}
          />

          <section className="data-panel" aria-busy={isLoading}>
            <div className="data-panel-header">
              <span>{visibleKits.length} {countLabel(visibleKits.length, "komplektas", "komplektai", "komplektų")}</span>
              <span>{statusFilter === "ACTIVE" ? "Naudojami komplektai" : "Išaktyvinti komplektai"}</span>
            </div>
            {isLoading && kits.length === 0 ? (
              <div className="table-state">
                <Loader2 className="spin" size={22} aria-hidden="true" />
                Kraunami komplektai...
              </div>
            ) : (
              <SkautaiDataTable
                rows={visibleKits}
                columns={columns}
                getRowKey={(kit) => kit.id}
                emptyState={(
                  <SkautaiEmptyState
                    compact
                    icon={Layers3}
                    title={statusFilter === "ACTIVE" ? "Aktyvių komplektų dar nėra" : "Neaktyvių komplektų nėra"}
                    description={statusFilter === "ACTIVE" ? "Sukurkite komplektą iš kartu naudojamų inventoriaus daiktų." : "Išaktyvinti komplektai bus rodomi čia."}
                  />
                )}
              />
            )}
          </section>
        </>
      )}

      <SkautaiPanel
        open={isFormOpen}
        title={editingKit ? "Redaguoti komplektą" : "Naujas komplektas"}
        description="Komplekto daiktai turi priklausyti tam pačiam inventoriaus saugotojui."
        variant="workspace"
        onClose={closeForm}
      >
        <form className="form-panel" onSubmit={submit}>
          <fieldset disabled={isSaving || (editingKit ? !canUpdate : !canCreate)}>
            <SkautaiFormSection title="Pagrindinė informacija" columns={2}>
              <TextField label="Pavadinimas *" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
              <label className="form-field">
                <span>Saugotojas</span>
                <select value={form.custodianId} onChange={(event) => changeCustodian(event.target.value)}>
                  <option value="">Bendras tuntas</option>
                  {sortedUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                  {editingKit?.custodianId && !units.some((unit) => unit.id === editingKit.custodianId) && (
                    <option value={editingKit.custodianId}>{editingKit.custodianName ?? "Pasirinktas vienetas"}</option>
                  )}
                </select>
                <small>Keičiant saugotoją pasirinkti daiktai išvalomi.</small>
              </label>
              <label className="form-field wide">
                <span>Aprašymas</span>
                <textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
            </SkautaiFormSection>

            <SkautaiFormSection title="Saugojimas ir atsakomybė" columns={2}>
              <label className="form-field">
                <span>Lokacija</span>
                <select value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}>
                  <option value="">Lokacija nepasirinkta</option>
                  {sortedLocations.filter((location) => location.isLeafSelectable).map((location) => (
                    <option key={location.id} value={location.id}>{location.fullPath}</option>
                  ))}
                  {editingKit?.locationId && !locations.some((location) => location.id === editingKit.locationId) && (
                    <option value={editingKit.locationId}>{editingKit.locationPath ?? editingKit.locationName ?? "Esama lokacija"}</option>
                  )}
                </select>
              </label>
              <TextField label="Laikina saugojimo žyma" value={form.temporaryStorageLabel} onChange={(value) => setForm((current) => ({ ...current, temporaryStorageLabel: value }))} />
              <label className="form-field wide">
                <span>Atsakingas narys</span>
                <select value={form.responsibleUserId} onChange={(event) => setForm((current) => ({ ...current, responsibleUserId: event.target.value }))}>
                  <option value="">Nepriskirtas</option>
                  {sortedMembers.map((member) => <option key={member.userId} value={member.userId}>{memberName(member)}</option>)}
                  {editingKit?.responsibleUserId && !members.some((member) => member.userId === editingKit.responsibleUserId) && (
                    <option value={editingKit.responsibleUserId}>{editingKit.responsibleUserName ?? "Esamas atsakingas narys"}</option>
                  )}
                </select>
                {!canListMembers && <small>Narių sąrašas nepasiekiamas pagal turimas teises; esamą atsakingą narį galima palikti arba pašalinti.</small>}
              </label>
            </SkautaiFormSection>

            <SkautaiFormSection
              title="Komplekto daiktai"
              description="Pasirinkite vieną ar daugiau to paties saugotojo inventoriaus įrašų ir jų kiekius."
              columns={1}
            >
              <div className="reservation-item-list">
                {form.items.map((row, index) => {
                  const selectedElsewhere = new Set(form.items.filter((item) => item.rowId !== row.rowId).map((item) => item.itemId));
                  const sourceItem = items.find((item) => item.id === row.itemId);
                  const existingKitItem = editingKit?.items.find((item) => item.itemId === row.itemId);
                  return (
                    <div className="reservation-item-row" key={row.rowId}>
                      <label className="form-field">
                        <span>Daiktas {index + 1}</span>
                        <select value={row.itemId} onChange={(event) => updateItemRow(row.rowId, { itemId: event.target.value })} required>
                          <option value="">Pasirinkite inventorių</option>
                          {scopeItems.filter((item) => !selectedElsewhere.has(item.id)).map((item) => (
                            <option key={item.id} value={item.id}>{item.name} — {item.quantity} {item.unitOfMeasure ?? "vnt."}</option>
                          ))}
                          {row.itemId && !scopeItems.some((item) => item.id === row.itemId) && (
                            <option value={row.itemId}>{sourceItem?.name ?? existingKitItem?.itemName ?? "Esamas komplekto daiktas"}</option>
                          )}
                        </select>
                      </label>
                      <label className="form-field">
                        <span>Kiekis</span>
                        <input
                          type="number"
                          min="1"
                          max={sourceItem?.quantity}
                          value={row.quantity}
                          onChange={(event) => updateItemRow(row.rowId, { quantity: event.target.value })}
                          required
                        />
                      </label>
                      <button className="icon-button danger-icon-button" type="button" title="Pašalinti eilutę" aria-label={`Pašalinti komplekto daikto eilutę ${index + 1}`} onClick={() => removeItemRow(row.rowId)}>
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button className="secondary-button compact-inline-button" type="button" onClick={addItemRow} disabled={scopeItems.length === 0 || form.items.length >= scopeItems.length}>
                <Plus size={17} aria-hidden="true" />
                Pridėti daiktą
              </button>
              {scopeItems.length === 0 && <small>Šiam saugotojui nėra laisvų aktyvių inventoriaus įrašų arba jų sąrašas nepasiekiamas.</small>}
            </SkautaiFormSection>

            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={closeForm}>Atšaukti</button>
              <button className="primary-button compact-primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Saugoma..." : editingKit ? "Išsaugoti" : "Sukurti komplektą"}
              </button>
            </div>
          </fieldset>
        </form>
      </SkautaiPanel>

      <SkautaiConfirmDialog
        open={Boolean(pendingDeactivate)}
        title="Išaktyvinti komplektą?"
        description={pendingDeactivate ? `Komplektas „${pendingDeactivate.name}“ taps neaktyvus, o jo daiktai vėl bus laisvi kitiems komplektams.` : undefined}
        confirmLabel="Išaktyvinti"
        isBusy={busyKitId === pendingDeactivate?.id}
        onCancel={() => setPendingDeactivate(null)}
        onConfirm={() => void deactivateKit()}
      />
    </SkautaiPageShell>
  );
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
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

async function fetchAllActiveItems(token: string, tuntasId: string) {
  const pageSize = 200;
  const result: Item[] = [];
  let offset = 0;

  for (let page = 0; page < 50; page += 1) {
    const response = await api.listItems(token, tuntasId, { status: "ACTIVE", limit: pageSize, offset });
    result.push(...response.items);
    if (!response.hasMore || response.items.length === 0) break;
    offset += response.items.length;
  }
  return result;
}

function memberName(member: Member) {
  return [member.name, member.surname].filter(Boolean).join(" ") || member.email;
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof ApiError || cause instanceof Error ? cause.message : fallback;
}
