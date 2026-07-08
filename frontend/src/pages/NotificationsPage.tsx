import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Notification, NotificationListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";

export function NotificationsPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [notificationsState, setNotificationsState] = useState<NotificationListResponse | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.token) return;
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .listNotifications(auth.token, unreadOnly)
      .then((response) => {
        if (!isCancelled) setNotificationsState(response);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Pranešimų užkrauti nepavyko.");
          setNotificationsState(null);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.token, reloadKey, unreadOnly]);

  const notifications = notificationsState?.notifications ?? [];
  const unreadCount = notificationsState?.unreadCount ?? 0;

  const summaryText = useMemo(() => {
    if (unreadCount === 0) return "Naujų pranešimų nėra";
    return `Neskaityti: ${unreadCount}`;
  }, [unreadCount]);

  async function openNotification(notification: Notification) {
    if (!auth?.token) return;
    const route = destinationForNotification(notification);
    setBusyId(notification.id);
    setError(null);
    try {
      if (!notification.readAt) {
        await api.markNotificationRead(auth.token, notification.id);
        setNotificationsState((current) => current ? {
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          notifications: current.notifications.map((item) =>
            item.id === notification.id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item
          )
        } : current);
      }
      if (route) navigate(route);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pranešimo pažymėti nepavyko.");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!auth?.token || unreadCount === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.markAllNotificationsRead(auth.token);
      setNotificationsState((current) => current ? {
        ...current,
        unreadCount: 0,
        notifications: current.notifications.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() }))
      } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pranešimų pažymėti nepavyko.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="notifications-page">
      <div className="page-heading-row">
        <div>
          <span className="section-kicker">PASKYRA</span>
          <h2>Pranešimai</h2>
        </div>
        <div className="toolbar-actions">
          <button className={`query-pill${unreadOnly ? " active" : ""}`} type="button" onClick={() => setUnreadOnly((value) => !value)}>
            Tik neskaityti
          </button>
          <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading}>
            <RefreshCw size={17} aria-hidden="true" />
            Atnaujinti
          </button>
          <button className="secondary-button" type="button" onClick={() => void markAllRead()} disabled={isSaving || unreadCount === 0}>
            <CheckCheck size={17} aria-hidden="true" />
            Pažymėti visus
          </button>
        </div>
      </div>

      <section className="data-panel notifications-summary-panel">
        <Bell size={20} aria-hidden="true" />
        <div>
          <strong>{summaryText}</strong>
          <span>Čia lieka pranešimai net tada, kai push pranešimas buvo praleistas.</span>
        </div>
      </section>

      {error && <p className="error-text">{error}</p>}

      {isLoading && notifications.length === 0 ? (
        <div className="empty-state">
          <Loader2 className="spin-icon" size={28} aria-hidden="true" />
          <strong>Kraunami pranešimai</strong>
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <Bell size={28} aria-hidden="true" />
          <strong>Pranešimų dar nėra</strong>
          <span>Čia matysi patvirtinimus, prašymų eigą ir sistemos žinutes.</span>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              className={`notification-row${notification.readAt ? "" : " unread"}`}
              type="button"
              onClick={() => void openNotification(notification)}
              disabled={busyId === notification.id}
            >
              <span className="notification-dot" aria-hidden="true" />
              <span>
                <strong>{notification.title}</strong>
                <small>{notification.body}</small>
                <em>{formatDateTime(notification.createdAt)}</em>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function destinationForNotification(notification: Notification) {
  const data = notification.data ?? {};
  if (notification.resource === "reservations") {
    const id = data.reservationId ?? notification.entityId;
    return id ? `/reservations/${id}` : null;
  }
  if (notification.resource === "bendras_requests") {
    const id = data.requestId ?? notification.entityId;
    return id ? `/requests/shared/${id}` : null;
  }
  if (notification.resource === "requisitions") {
    const id = data.requestId ?? notification.entityId;
    return id ? `/requests/requisitions/${id}` : null;
  }
  return null;
}

function formatDateTime(value: string) {
  return value.slice(0, 16).replace("T", " ");
}
