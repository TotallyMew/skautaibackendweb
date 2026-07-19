import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarDays, ClipboardList, Loader2, MapPin, UserRound, type LucideIcon } from "lucide-react";
import { api } from "../api/client";
import type { Location, Reservation, ReservationMovement } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { countLabel, proposalStatusLabel, reviewStatusLabel, statusLabel } from "../utils/display";

type ReservationWithProposalActors = Reservation & {
  pickupProposedByUserId?: string | null;
  returnProposedByUserId?: string | null;
};

type MovementType = "ISSUE" | "RETURN" | "RETURN_MARKED";

export function ReservationDetailPage() {
  const { reservationId } = useParams();
  const { auth } = useAuth();
  const [reservation, setReservation] = useState<ReservationWithProposalActors | null>(null);
  const [movements, setMovements] = useState<ReservationMovement[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unitReviewNotes, setUnitReviewNotes] = useState("");
  const [topLevelReviewNotes, setTopLevelReviewNotes] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("ISSUE");
  const [movementQuantities, setMovementQuantities] = useState<Record<string, string>>({});
  const [movementLocationId, setMovementLocationId] = useState("");
  const [movementNotes, setMovementNotes] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [returnLocationId, setReturnLocationId] = useState("");

  const refreshReservation = useCallback(async (showLoading: boolean) => {
    if (!reservationId || !auth?.token || !auth.activeTuntasId) {
      setReservation(null);
      setMovements([]);
      return false;
    }

    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const [nextReservation, movementResponse, locationResponse] = await Promise.all([
        api.getReservation(auth.token, auth.activeTuntasId, reservationId),
        api.listReservationMovements(auth.token, auth.activeTuntasId, reservationId),
        api.listLocations(auth.token, auth.activeTuntasId).catch(() => ({ locations: [], total: 0 }))
      ]);
      const reservationWithActors = nextReservation as ReservationWithProposalActors;
      setReservation(reservationWithActors);
      setMovements(movementResponse.movements);
      setLocations(locationResponse.locations);
      setPickupAt(toDateTimeLocalValue(reservationWithActors.pickupAt));
      setPickupLocationId(reservationWithActors.pickupLocationId ?? "");
      setReturnAt(toDateTimeLocalValue(reservationWithActors.returnAt));
      setReturnLocationId(reservationWithActors.returnLocationId ?? "");
      return true;
    } catch (cause) {
      setError(errorMessage(cause, "Nepavyko užkrauti rezervacijos."));
      if (showLoading) {
        setReservation(null);
        setMovements([]);
      }
      return false;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [auth?.activeTuntasId, auth?.token, reservationId]);

  useEffect(() => {
    void refreshReservation(true);
  }, [refreshReservation]);

  const capabilities = reservation?.capabilities;
  const canReviewUnit = capabilities?.canReviewUnit === true;
  const canReviewTopLevel = capabilities?.canReviewTopLevel === true;
  const canCancel = capabilities?.canCancel === true;

  const movementOptions = useMemo(() => {
    if (!reservation) return [] as Array<{ value: MovementType; label: string }>;
    const options: Array<{ value: MovementType; label: string }> = [];
    if (capabilities?.canIssue) {
      options.push({ value: "ISSUE", label: "Išduoti inventorių" });
    }
    if (capabilities?.canConfirmReturn) {
      options.push({ value: "RETURN", label: "Patvirtinti grąžinimą" });
    }
    if (capabilities?.canMarkReturned) {
      options.push({ value: "RETURN_MARKED", label: "Pažymėti kaip grąžintą" });
    }
    return options;
  }, [capabilities, reservation]);

  useEffect(() => {
    if (movementOptions.length > 0 && !movementOptions.some((option) => option.value === movementType)) {
      setMovementType(movementOptions[0].value);
      setMovementQuantities({});
    }
  }, [movementOptions, movementType]);

  async function runAction(action: string, successMessage: string, operation: () => Promise<unknown>) {
    if (busyAction) return;
    setBusyAction(action);
    setError(null);
    setMessage(null);
    try {
      await operation();
      const refreshed = await refreshReservation(false);
      if (refreshed) setMessage(successMessage);
    } catch (cause) {
      setError(errorMessage(cause, "Veiksmo atlikti nepavyko."));
    } finally {
      setBusyAction(null);
    }
  }

  function review(level: "unit" | "top", decision: "APPROVED" | "REJECTED") {
    if (!reservationId || !auth?.token || !auth.activeTuntasId) return;
    const notes = level === "unit" ? unitReviewNotes : topLevelReviewNotes;
    if (decision === "REJECTED" && !window.confirm("Atmesti šią rezervacijos dalį?")) return;
    const operation = level === "unit"
      ? () => api.reviewReservationUnit(auth.token, auth.activeTuntasId!, reservationId, { status: decision, notes: optional(notes) })
      : () => api.reviewReservationTopLevel(auth.token, auth.activeTuntasId!, reservationId, { status: decision, notes: optional(notes) });
    void runAction(
      `${level}-${decision}`,
      decision === "APPROVED" ? "Rezervacija patvirtinta." : "Rezervacija atmesta.",
      operation
    );
  }

  function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reservation || !reservationId || !auth?.token || !auth.activeTuntasId) return;

    const items = reservation.items.flatMap((item) => {
      const quantity = Number(movementQuantities[item.itemId] ?? 0);
      const maximum = movementMaximum(item, movementType);
      const canUseItem = movementType === "RETURN_MARKED"
        ? item.canMarkReturned === true
        : movementType === "RETURN" ? item.canConfirmReturn === true : item.canIssue === true;
      return canUseItem && Number.isInteger(quantity) && quantity > 0 && quantity <= maximum
        ? [{ itemId: item.itemId, quantity }]
        : [];
    });
    if (items.length === 0) {
      setError("Įvesk bent vieno inventoriaus įrašo leistiną kiekį.");
      return;
    }

    const body = { items, locationId: optional(movementLocationId), notes: optional(movementNotes) };
    const operation = movementType === "ISSUE"
      ? () => api.issueReservationItems(auth.token, auth.activeTuntasId!, reservationId, body)
      : movementType === "RETURN"
        ? () => api.returnReservationItems(auth.token, auth.activeTuntasId!, reservationId, body)
        : () => api.markReservationItemsReturned(auth.token, auth.activeTuntasId!, reservationId, body);
    void runAction(`movement-${movementType}`, "Inventoriaus judėjimas užregistruotas.", operation).then(() => {
      setMovementQuantities({});
      setMovementNotes("");
    });
  }

  function submitProposal(kind: "pickup" | "return", event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reservationId || !auth?.token || !auth.activeTuntasId) return;
    const value = kind === "pickup" ? pickupAt : returnAt;
    const locationId = kind === "pickup" ? pickupLocationId : returnLocationId;
    const instant = toInstant(value);
    if (!instant) {
      setError("Pasirink tinkamą datą ir laiką.");
      return;
    }
    const operation = kind === "pickup"
      ? () => api.updateReservationPickup(auth.token, auth.activeTuntasId!, reservationId, { pickupAt: instant, pickupLocationId: optional(locationId), response: "PROPOSE" })
      : () => api.updateReservationReturnTime(auth.token, auth.activeTuntasId!, reservationId, { returnAt: instant, returnLocationId: optional(locationId), response: "PROPOSE" });
    void runAction(`${kind}-propose`, "Laiko pasiūlymas išsaugotas.", operation);
  }

  function acceptProposal(kind: "pickup" | "return") {
    if (!reservationId || !auth?.token || !auth.activeTuntasId) return;
    const operation = kind === "pickup"
      ? () => api.updateReservationPickup(auth.token, auth.activeTuntasId!, reservationId, { response: "ACCEPT" })
      : () => api.updateReservationReturnTime(auth.token, auth.activeTuntasId!, reservationId, { response: "ACCEPT" });
    void runAction(`${kind}-accept`, "Laiko pasiūlymas priimtas.", operation);
  }

  function cancelReservation() {
    if (!reservationId || !auth?.token || !auth.activeTuntasId) return;
    if (!window.confirm("Atšaukti šią rezervaciją?")) return;
    void runAction(
      "cancel",
      "Rezervacija atšaukta.",
      () => api.cancelReservation(auth.token, auth.activeTuntasId!, reservationId)
    );
  }

  const selectableLocations = locations.filter((location) => location.isLeafSelectable);

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/reservations">
            <ArrowLeft size={17} aria-hidden="true" />
            Grįžti į rezervacijas
          </Link>
          <h2>{reservation?.title ?? "Rezervacija"}</h2>
        </div>
        {reservation && <StatusBadge status={reservation.status} />}
      </div>

      {isLoading && (
        <div className="data-panel">
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunama rezervacija...
          </div>
        </div>
      )}

      {error && <div className="inline-alert" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
      {message && <div className="inline-success" role="status"><span>{message}</span></div>}

      {!isLoading && reservation && (
        <>
          <div className="detail-grid">
            <article className="detail-main">
              <div className="detail-title-row">
                <div>
                  <span className="eyebrow">{reservation.requestingUnitName ?? "Bendras prašymas"}</span>
                  <h3>{reservation.title}</h3>
                </div>
                <div className="quantity-card">
                  <strong>{reservation.totalQuantity} vnt.</strong>
                  <span>{reservation.totalItems} {countLabel(reservation.totalItems, "įrašas", "įrašai", "įrašų")}</span>
                </div>
              </div>

              {reservation.notes && <p className="detail-description">{reservation.notes}</p>}

              <div className="info-grid">
                <InfoTile icon={CalendarDays} label="Pradžia" value={formatDate(reservation.startDate)} />
                <InfoTile icon={CalendarDays} label="Pabaiga" value={formatDate(reservation.endDate)} />
                <InfoTile icon={UserRound} label="Rezervavo" value={reservation.reservedByName ?? "-"} />
                <InfoTile icon={MapPin} label="Paėmimas" value={pickupSummary(reservation)} />
                <InfoTile icon={MapPin} label="Grąžinimas" value={returnSummary(reservation)} />
                <InfoTile icon={ClipboardList} label="Atnaujinta" value={formatDateTime(reservation.updatedAt)} />
              </div>

              <section className="detail-section">
                <h3>Rezervuotas inventorius</h3>
                <div className="table-wrap">
                  <table className="data-table compact-data-table">
                    <thead><tr><th>Inventorius</th><th>Kiekis</th><th>Išduota</th><th>Grąžinta</th><th>Likutis</th></tr></thead>
                    <tbody>
                      {reservation.items.map((item) => (
                        <tr key={item.itemId}>
                          <td><strong>{item.itemName}</strong><span>{item.custodianName ?? "Bendras tuntas"}</span></td>
                          <td>{item.quantity}</td>
                          <td>{item.issuedQuantity ?? 0}</td>
                          <td>{item.returnedQuantity ?? 0}</td>
                          <td><strong>{item.remainingToIssue ?? 0} išduoti</strong><span>{item.remainingToReturn ?? 0} grąžinti</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </article>

            <aside className="detail-side">
              <DetailFact label="Būsena" value={statusLabel(reservation.status)} />
              <DetailFact label="Padalinio peržiūra" value={reviewStatusLabel(reservation.unitReviewStatus ?? "NOT_REQUIRED")} />
              <DetailFact label="Tunto peržiūra" value={reviewStatusLabel(reservation.topLevelReviewStatus ?? "NOT_REQUIRED")} />
              <DetailFact label="Paėmimo pasiūlymas" value={proposalStatusLabel(reservation.pickupProposalStatus ?? "NONE")} />
              <DetailFact label="Grąžinimo pasiūlymas" value={proposalStatusLabel(reservation.returnProposalStatus ?? "NONE")} />
              <DetailFact label="Sukurta" value={formatDateTime(reservation.createdAt)} />
            </aside>
          </div>

          {(canReviewUnit || canReviewTopLevel || canCancel) && (
            <section className="form-section" aria-labelledby="reservation-actions-heading">
              <div className="form-section-heading"><ClipboardList aria-hidden="true" /><div><h3 id="reservation-actions-heading">Rezervacijos sprendimai</h3><span>Veiksmai rodomi pagal tavo teises ir dabartinę būseną.</span></div></div>
              {canReviewUnit && <ReviewForm title="Padalinio peržiūra" notes={unitReviewNotes} onNotesChange={setUnitReviewNotes} disabled={Boolean(busyAction)} onApprove={() => review("unit", "APPROVED")} onReject={() => review("unit", "REJECTED")} />}
              {canReviewTopLevel && <ReviewForm title="Tunto peržiūra" notes={topLevelReviewNotes} onNotesChange={setTopLevelReviewNotes} disabled={Boolean(busyAction)} onApprove={() => review("top", "APPROVED")} onReject={() => review("top", "REJECTED")} />}
              {canCancel && <div className="form-actions"><button className="primary-button compact-primary-button tone-danger" type="button" disabled={Boolean(busyAction)} onClick={cancelReservation}>Atšaukti rezervaciją</button></div>}
            </section>
          )}

          {movementOptions.length > 0 && (
            <form className="form-section" onSubmit={submitMovement}>
              <div className="form-section-heading"><ClipboardList aria-hidden="true" /><div><h3>Inventoriaus judėjimas</h3><span>Įvesk kiekį tik toms eilutėms, kurias tvarkai dabar.</span></div></div>
              <div className="form-grid">
                <label className="form-field wide"><span>Veiksmas</span><select value={movementType} onChange={(event) => { setMovementType(event.target.value as MovementType); setMovementQuantities({}); }} disabled={Boolean(busyAction)}>{movementOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                {reservation.items.map((item) => {
                  const maximum = movementMaximum(item, movementType);
                  const canUseItem = movementType === "RETURN_MARKED" ? item.canMarkReturned === true : movementType === "RETURN" ? item.canConfirmReturn === true : item.canIssue === true;
                  return (
                    <label className="form-field" key={`${movementType}-${item.itemId}`}>
                      <span>{item.itemName} (galima {canUseItem ? maximum : 0})</span>
                      <input type="number" min="0" max={canUseItem ? maximum : 0} step="1" value={movementQuantities[item.itemId] ?? ""} onChange={(event) => setMovementQuantities((current) => ({ ...current, [item.itemId]: event.target.value }))} disabled={!canUseItem || maximum === 0 || Boolean(busyAction)} />
                    </label>
                  );
                })}
                <label className="form-field"><span>Judėjimo vieta</span><select value={movementLocationId} onChange={(event) => setMovementLocationId(event.target.value)} disabled={Boolean(busyAction)}><option value="">Nenurodyta</option>{selectableLocations.map((location) => <option key={location.id} value={location.id}>{location.fullPath}</option>)}</select></label>
                <label className="form-field wide"><span>Pastabos</span><textarea rows={2} value={movementNotes} onChange={(event) => setMovementNotes(event.target.value)} disabled={Boolean(busyAction)} /></label>
              </div>
              <div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={Boolean(busyAction)}>Išsaugoti judėjimą</button></div>
            </form>
          )}

          {capabilities?.canManagePickup && (
            <TimeProposalForm kind="pickup" title="Paėmimo laikas ir vieta" value={pickupAt} locationId={pickupLocationId} proposalStatus={reservation.pickupProposalStatus} canAccept={reservation.pickupProposalStatus === "PENDING" && reservation.pickupProposedByUserId !== auth?.userId} locations={selectableLocations} disabled={Boolean(busyAction)} onValueChange={setPickupAt} onLocationChange={setPickupLocationId} onSubmit={(event) => submitProposal("pickup", event)} onAccept={() => acceptProposal("pickup")} />
          )}

          {capabilities?.canManageReturn && (
            <TimeProposalForm kind="return" title="Grąžinimo laikas ir vieta" value={returnAt} locationId={returnLocationId} proposalStatus={reservation.returnProposalStatus} canAccept={reservation.returnProposalStatus === "PENDING" && reservation.returnProposedByUserId !== auth?.userId} locations={selectableLocations} disabled={Boolean(busyAction)} onValueChange={setReturnAt} onLocationChange={setReturnLocationId} onSubmit={(event) => submitProposal("return", event)} onAccept={() => acceptProposal("return")} />
          )}

          <section className="detail-section">
            <h3>Judėjimų istorija</h3>
            {movements.length === 0 ? <p>Inventoriaus judėjimų dar nėra.</p> : (
              <div className="table-wrap"><table className="data-table compact-data-table"><thead><tr><th>Laikas</th><th>Veiksmas</th><th>Inventorius</th><th>Kiekis</th><th>Vieta / pastabos</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{formatDateTime(movement.createdAt)}</td><td>{movementTypeLabel(movement.type)}</td><td>{movement.itemName ?? movement.itemId}</td><td>{movement.quantity}</td><td><strong>{movement.locationPath ?? "-"}</strong><span>{movement.notes ?? ""}</span></td></tr>)}</tbody></table></div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function ReviewForm({ title, notes, onNotesChange, disabled, onApprove, onReject }: { title: string; notes: string; onNotesChange: (value: string) => void; disabled: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <form className="form-panel" onSubmit={(event) => { event.preventDefault(); onApprove(); }}>
      <div className="form-grid"><label className="form-field wide"><span>{title}: pastabos (nebūtina)</span><textarea rows={2} value={notes} onChange={(event) => onNotesChange(event.target.value)} disabled={disabled} /></label></div>
      <div className="form-actions"><button className="secondary-button" type="button" disabled={disabled} onClick={onReject}>Atmesti</button><button className="primary-button compact-primary-button" type="submit" disabled={disabled}>Patvirtinti</button></div>
    </form>
  );
}

function TimeProposalForm({ kind, title, value, locationId, proposalStatus, canAccept, locations, disabled, onValueChange, onLocationChange, onSubmit, onAccept }: { kind: string; title: string; value: string; locationId: string; proposalStatus?: string; canAccept: boolean; locations: Location[]; disabled: boolean; onValueChange: (value: string) => void; onLocationChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onAccept: () => void }) {
  return (
    <form className="form-section" onSubmit={onSubmit} aria-labelledby={`${kind}-proposal-heading`}>
      <div className="form-section-heading"><CalendarDays aria-hidden="true" /><div><h3 id={`${kind}-proposal-heading`}>{title}</h3><span>Dabartinė pasiūlymo būsena: {proposalStatusLabel(proposalStatus ?? "NONE")}</span></div></div>
      <div className="form-grid"><label className="form-field"><span>Data ir laikas</span><input type="datetime-local" value={value} onChange={(event) => onValueChange(event.target.value)} disabled={disabled} required /></label><label className="form-field"><span>Vieta</span><select value={locationId} onChange={(event) => onLocationChange(event.target.value)} disabled={disabled}><option value="">Nenurodyta</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.fullPath}</option>)}</select></label></div>
      <div className="form-actions">{canAccept && <button className="secondary-button" type="button" disabled={disabled} onClick={onAccept}>Priimti pasiūlymą</button>}<button className="primary-button compact-primary-button" type="submit" disabled={disabled}>Pateikti pasiūlymą</button></div>
    </form>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="info-tile"><Icon size={19} aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>; }
function DetailFact({ label, value }: { label: string; value: string }) { return <div className="detail-fact"><span>{label}</span><strong>{value}</strong></div>; }
function StatusBadge({ status }: { status: string }) { return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabel(status)}</span>; }

function movementMaximum(item: Reservation["items"][number], type: MovementType) { if (type === "ISSUE") return item.remainingToIssue ?? 0; if (type === "RETURN") return item.remainingToReceive ?? 0; return item.remainingToMarkReturned ?? 0; }
function movementTypeLabel(type: string) { return ({ ISSUE: "Išduota", RETURN_MARKED: "Pažymėta grąžinimui", RETURN: "Grąžinimas patvirtintas" } as Record<string, string>)[type] ?? type; }
function pickupSummary(reservation: Reservation) { return [formatDateTime(reservation.pickupAt), reservation.pickupLocationPath].filter(Boolean).join(" / ") || "-"; }
function returnSummary(reservation: Reservation) { return [formatDateTime(reservation.returnAt), reservation.returnLocationPath].filter(Boolean).join(" / ") || "-"; }
function optional(value: string) { const trimmed = value.trim(); return trimmed ? trimmed : null; }
function toInstant(value: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function toDateTimeLocalValue(value?: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
function errorMessage(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
function formatDate(value?: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date); }
function formatDateTime(value?: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium", timeStyle: "short" }).format(date); }
