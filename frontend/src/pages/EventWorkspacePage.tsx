import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Boxes, ClipboardCheck, Euro, Loader2, PackageCheck, ShieldCheck, TentTree, UsersRound } from "lucide-react";
import { Link, NavLink, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Event } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiErrorState, SkautaiPageShell, SkautaiStatusPill } from "../components/ui/Skautai";
import { displayTitle, statusLabel } from "../utils/display";
import { EventStaffSection, EventPastovyklesSection, EventTemplatesSection } from "./EventWorkspacePeople";
import { EventPlanSection } from "./EventWorkspacePlan";
import { EventMovementsSection, EventPackingSection, EventPurchasesSection, EventReconciliationSection } from "./EventWorkspaceOperations";

export type EventWorkspaceSection = "staff" | "plan" | "pastovykles" | "packing" | "movements" | "purchases" | "reconciliation" | "templates";

export type EventWorkspaceContext = {
  event: Event;
  token: string;
  tuntasId: string;
  userId: string;
  canViewStaff: boolean;
  canViewPlan: boolean;
  canViewInventory: boolean;
  canViewPastovykles: boolean;
  canManage: boolean;
  canManageInventory: boolean;
  canManagePurchases: boolean;
  canManageFinance: boolean;
  canViewFinance: boolean;
  canOpenMovement: boolean;
  canViewReconciliation: boolean;
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
  const capabilities = event?.capabilities;
  const canViewStaff = capabilities?.canViewStaff ?? false;
  const canViewPlan = capabilities?.canViewPlan ?? false;
  const canViewInventory = capabilities?.canViewInventory ?? false;
  const canViewPastovykles = capabilities?.canViewPastovykles ?? false;
  const canManage = capabilities?.canManage ?? false;
  const canManageInventory = capabilities?.canManageInventory ?? false;
  const canManagePurchases = capabilities?.canManagePurchases ?? false;
  const canManageFinance = capabilities?.canManageFinance ?? false;
  const canViewFinance = capabilities?.canViewFinance ?? false;
  const canOpenMovement = capabilities?.canOpenMovement ?? false;
  const canViewReconciliation = capabilities?.canViewReconciliation ?? false;
  const context = event && auth?.token && auth.activeTuntasId ? {
    event, token: auth.token, tuntasId: auth.activeTuntasId, userId: auth.userId,
    canViewStaff, canViewPlan, canViewInventory, canViewPastovykles,
    canManage, canManageInventory, canManagePurchases, canManageFinance, canViewFinance, canOpenMovement, canViewReconciliation, refreshEvent
  } : null;
  const visibleSections = context ? sections.filter((candidate) => canViewSection(candidate.key, context)) : [];
  const canViewActiveSection = context ? canViewSection(section, context) : false;

  return (
    <SkautaiPageShell
      className="event-workspace-page"
      eyebrow="Renginio darbo sritis"
      title={event ? displayTitle(event.name) : activeSection?.label ?? "Renginys"}
      description={activeSection ? `${activeSection.label}: valdykite tą pačią renginio eigą kaip mobiliojoje programėlėje.` : undefined}
      actions={event && <SkautaiStatusPill status={event.status}>{statusLabel(event.status)}</SkautaiStatusPill>}
      width="wide"
    >
      <Link className="back-link" to={eventId ? `/events/${eventId}` : "/events"}><ArrowLeft size={17} aria-hidden="true" />Grįžti į renginio apžvalgą</Link>
      {eventId && visibleSections.length > 0 && <nav className="event-workspace-nav" aria-label="Renginio darbo sritys">{visibleSections.map(({ key, label, icon: Icon }) => <NavLink key={key} className={({ isActive }) => isActive ? "active" : undefined} to={`/events/${eventId}/${key}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav>}
      {isLoading && <div className="table-state"><Loader2 className="spin" size={22} />Kraunama renginio darbo sritis...</div>}
      {error && <SkautaiErrorState description={error} />}
      {!isLoading && context && !canViewActiveSection && <SkautaiErrorState description="Jums nepriskirta renginio rolė, suteikianti prieigą prie šios darbo srities." />}
      {!isLoading && context && canViewActiveSection && <WorkspaceSection section={section} context={context} />}
    </SkautaiPageShell>
  );
}

function canViewSection(section: EventWorkspaceSection, context: EventWorkspaceContext): boolean {
  switch (section) {
    case "staff": return context.canViewStaff;
    case "plan": return context.canViewPlan;
    case "pastovykles": return context.canViewPastovykles;
    case "packing":
    case "movements":
    case "templates": return context.canViewInventory;
    case "reconciliation": return context.canViewReconciliation;
    case "purchases": return context.canViewFinance;
  }
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
