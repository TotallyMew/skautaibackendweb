import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Calendar, Loader2, MapPin, Package, QrCode, UserRound, type LucideIcon } from "lucide-react";
import { api } from "../api/client";
import type { Item } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { itemOriginLabel, itemTypeLabel, statusLabel } from "../utils/display";

export function InventoryDetailPage() {
  const { itemId } = useParams();
  const { auth } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId || !auth?.token || !auth.activeTuntasId) {
      setItem(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .getItem(auth.token, auth.activeTuntasId, itemId)
      .then((response) => {
        if (!isCancelled) {
          setItem(response);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Nepavyko užkrauti inventoriaus įrašo.");
          setItem(null);
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
  }, [auth?.activeTuntasId, auth?.token, itemId]);

  const location = useMemo(() => {
    if (!item) return "-";
    return item.locationPath ?? item.locationName ?? item.temporaryStorageLabel ?? "-";
  }, [item]);

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/inventory">
            <ArrowLeft size={17} aria-hidden="true" />
            Grįžti į inventorių
          </Link>
          <h2>{item?.name ?? "Inventoriaus įrašas"}</h2>
        </div>
        {item && <StatusBadge status={item.status} />}
      </div>

      {isLoading && (
        <div className="data-panel">
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunamas inventoriaus įrašas...
          </div>
        </div>
      )}

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && item && (
        <div className="detail-grid">
          <article className="detail-main">
            <div className="detail-title-row">
              <div>
                <span className="eyebrow">{item.category} / {itemTypeLabel(item.type)}</span>
                <h3>{item.name}</h3>
              </div>
              <div className={item.isLowStock ? "quantity-card danger-border" : "quantity-card"}>
                <strong>{item.quantity} {item.unitOfMeasure ?? "vnt."}</strong>
                <span>{item.minimumQuantity != null ? `Min. ${item.minimumQuantity}` : "Kiekis"}</span>
              </div>
            </div>

            {item.description && <p className="detail-description">{item.description}</p>}

            <div className="info-grid">
              <InfoTile icon={Package} label="Būklė" value={item.condition} />
              <InfoTile icon={UserRound} label="Saugotojas" value={item.custodianName ?? "Bendras tuntas"} />
              <InfoTile icon={MapPin} label="Lokacija" value={location} />
              <InfoTile icon={QrCode} label="QR kodas" value={item.qrToken} />
              <InfoTile icon={Calendar} label="Atnaujinta" value={formatDate(item.updatedAt)} />
              <InfoTile icon={UserRound} label="Atsakingas" value={item.responsibleUserName ?? "-"} />
            </div>

            {Boolean(item.customFields?.length) && (
              <section className="detail-section">
                <h3>Papildomi laukai</h3>
                <dl className="detail-list">
                  {item.customFields?.map((field) => (
                    <div key={field.id}>
                      <dt>{field.fieldName}</dt>
                      <dd>{field.fieldValue || "-"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {item.notes && (
              <section className="detail-section">
                <h3>Pastabos</h3>
                <p>{item.notes}</p>
              </section>
            )}
          </article>

          <aside className="detail-side">
            <DetailFact label="Kilmė" value={itemOriginLabel(item.origin)} />
            <DetailFact label="Rinkinys" value={item.kitName ?? "-"} />
            <DetailFact label="Sukurė" value={item.createdByUserName ?? "-"} />
            <DetailFact label="Sukurta" value={formatDate(item.createdAt)} />
            <DetailFact label="Pirkimo data" value={item.purchaseDate ?? "-"} />
            <DetailFact label="Pirkimo kaina" value={formatPrice(item.purchasePrice)} />
            {item.rejectionReason && <DetailFact label="Atmetimo priežastis" value={item.rejectionReason} />}
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatPrice(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}
