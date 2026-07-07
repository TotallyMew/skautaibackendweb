import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarDays, ClipboardList, Loader2, MapPin, UserRound, type LucideIcon } from "lucide-react";
import { api } from "../api/client";
import type { Reservation } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { countLabel, proposalStatusLabel, reviewStatusLabel, statusLabel } from "../utils/display";

export function ReservationDetailPage() {
  const { reservationId } = useParams();
  const { auth } = useAuth();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId || !auth?.token || !auth.activeTuntasId) {
      setReservation(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .getReservation(auth.token, auth.activeTuntasId, reservationId)
      .then((response) => {
        if (!isCancelled) {
          setReservation(response);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Nepavyko užkrauti rezervacijos.");
          setReservation(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, reservationId]);

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/requests">
            <ArrowLeft size={17} aria-hidden="true" />
            Grįžti į prašymus
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

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && reservation && (
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
                  <thead>
                    <tr>
                      <th>Inventorius</th>
                      <th>Kiekis</th>
                      <th>Išduota</th>
                      <th>Grąžinta</th>
                      <th>Likutis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservation.items.map((item) => (
                      <tr key={item.itemId}>
                        <td>
                          <strong>{item.itemName}</strong>
                          <span>{item.custodianName ?? "Bendras tuntas"}</span>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{item.issuedQuantity ?? 0}</td>
                        <td>{item.returnedQuantity ?? 0}</td>
                        <td>
                          <strong>{item.remainingToIssue ?? 0} išduoti</strong>
                          <span>{item.remainingToReturn ?? 0} grąžinti</span>
                        </td>
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
      )}
    </section>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="info-tile">
      <Icon size={19} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}

function pickupSummary(reservation: Reservation) {
  return [formatDateTime(reservation.pickupAt), reservation.pickupLocationPath].filter(Boolean).join(" / ") || "-";
}

function returnSummary(reservation: Reservation) {
  return [formatDateTime(reservation.returnAt), reservation.returnLocationPath].filter(Boolean).join(" / ") || "-";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium"
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
