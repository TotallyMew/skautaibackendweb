import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Boxes, ClipboardCheck, Euro, Loader2, PackageCheck, ShieldCheck, TentTree, UsersRound } from "lucide-react";
import { Link, NavLink, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Event } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiErrorState, SkautaiPageShell, SkautaiStatusPill } from "../components/ui/Skautai";
import { statusLabel } from "../utils/display";
import { hasPermission } from "../utils/permissions";
import { EventStaffSection, EventPastovyklesSection, EventTemplatesSection } from "./EventWorkspacePeople";
import { EventPlanSection } from "./EventWorkspacePlan";
import { EventMovementsSection, EventPackingSection, EventPurchasesSection, EventReconciliationSection } from "./EventWorkspaceOperations";

export type EventWorkspaceSection = "staff" | "plan" | "pastovykles" | "packing" | "movements" | "purchases" | "reconciliation" | "templates";

export type EventWorkspaceContext = {
  event: Event;
  token: string;
  tuntasId: string;
  userId: string;
  canManage: boolean;
  refreshEvent: () => Promise<void>;
};

const sections: Array<{ key: EventWorkspaceSection; label: string; icon: typeof UsersRound }> = [
  { key: "staff", label: "Komanda", icon: UsersRound },
  { key: "plan", label: "Inventoriaus planas", icon: Boxes },
  { key: "pastovykles", label: "Pastovyklės", icon: TentTree },
  { key: "packing", label: "Pakavimas", icon: PackageCheck },
  { key: "movements", label: "Judėjimas", icon: ClipboardCheck },
  { key: "purchases", label: "Pirkimai", icon: Euro },
  { key: "reconciliation", label: "Užbaigimas", icon: ShieldCheck },
  { key: "templates", label: "Šablonai", icon: Boxes }
];

export function EventWorkspacePage({ section }: { section: EventWorkspaceSection }) {
  const { eventId } = useParams();
  const { auth } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEvent = useCallback(async () => {
    if (!eventId || !auth?.token || !auth.activeTuntasId) return;
    setEvent(await api.getEvent(auth.token, auth.activeTuntasId, eventId));
  }, [auth?.activeTuntasId, auth?.token, eventId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    refreshEvent()
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Renginio darbo srities atverti nepavyko."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [refreshEvent]);

  const activeSection = sections.find((candidate) => candidate.key === section);
  const canManage = hasPermission(auth?.permissions, "events.manage") || hasPermission(auth?.permissions, "events.inventory.distribute");
  const context = event && auth?.token && auth.activeTuntasId ? { event, token: auth.token, tuntasId: auth.activeTuntasId, userId: auth.userId, canManage, refreshEvent } : null;

  return (
    <SkautaiPageShell
      className="event-workspace-page"
      eyebrow="Renginio darbo sritis"
      title={event?.name ?? activeSection?.label ?? "Renginys"}
      description={activeSection ? `${activeSection.label}: valdykite tą pačią renginio eigą kaip mobiliojoje programėlėje.` : undefined}
      actions={event && <SkautaiStatusPill status={event.status}>{statusLabel(event.status)}</SkautaiStatusPill>}
      width="wide"
    >
      <Link className="back-link" to={eventId ? `/events/${eventId}` : "/events"}><ArrowLeft size={17} aria-hidden="true" />Grįžti į renginio apžvalgą</Link>
      {eventId && <nav className="event-workspace-nav" aria-label="Renginio darbo sritys">{sections.map(({ key, label, icon: Icon }) => <NavLink key={key} to={`/events/${eventId}/${key}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav>}
      {isLoading && <div className="table-state"><Loader2 className="spin" size={22} />Kraunama renginio darbo sritis...</div>}
      {error && <SkautaiErrorState description={error} />}
      {!isLoading && context && <WorkspaceSection section={section} context={context} />}
    </SkautaiPageShell>
  );
}

function WorkspaceSection({ section, context }: { section: EventWorkspaceSection; context: EventWorkspaceContext }) {
  switch (section) {
    case "staff": return <EventStaffSection context={context} />;
    case "plan": return <EventPlanSection context={context} />;
    case "pastovykles": return <EventPastovyklesSection context={context} />;
    case "packing": return <EventPackingSection context={context} />;
    case "movements": return <EventMovementsSection context={context} />;
    case "purchases": return <EventPurchasesSection context={context} />;
    case "reconciliation": return <EventReconciliationSection context={context} />;
    case "templates": return <EventTemplatesSection context={context} />;
  }
}
