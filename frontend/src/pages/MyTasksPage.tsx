import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, TimerReset, UserRoundCheck, UsersRound, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { LeadershipChangeRequest, Member, MyTask, MyTaskListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiPageShell } from "../components/ui/Skautai";
import { taskBucketLabel, taskRoutePath, taskUrgencyLabel } from "../utils/tasks";

const bucketOrder = ["URGENT", "TODAY", "NEXT", "WATCH"];

export function MyTasksPage() {
  const { auth } = useAuth();
  const [tasksState, setTasksState] = useState<MyTaskListResponse | null>(null);
  const [leadershipRequests, setLeadershipRequests] = useState<LeadershipChangeRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedSuccessors, setSelectedSuccessors] = useState<Record<string, string>>({});
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(auth?.token && auth.activeTuntasId);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) {
      setTasksState(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.listMyTasks(auth.token, auth.activeTuntasId),
      api.listLeadershipChangeRequests(auth.token, auth.activeTuntasId).catch(() => ({ requests: [], total: 0 })),
      api.listMembers(auth.token, auth.activeTuntasId).catch(() => ({ members: [], total: 0 }))
    ])
      .then(([response, leadershipResponse, memberResponse]) => {
        if (!isCancelled) {
          setTasksState(response);
          setLeadershipRequests(leadershipResponse.requests);
          setMembers(memberResponse.members);
        }
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Nepavyko įkelti užduočių.");
          setTasksState(null);
          setLeadershipRequests([]);
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
  }, [auth?.activeTuntasId, auth?.token, reloadKey]);

  const tasks = (tasksState?.tasks ?? []).filter((task) => task.type !== "LEADERSHIP_CHANGE_REVIEW_PENDING");
  const groupedTasks = useMemo(() => groupTasks(tasks), [tasks]);
  const total = tasks.length;
  const urgentCount = tasks.filter((task) => task.urgency === "HIGH" || task.bucket === "URGENT").length;
  const dueCount = tasks.filter((task) => Boolean(task.dueAt)).length;
  const combinedTotal = total + leadershipRequests.length;

  async function reviewLeadershipChange(requestId: string, action: "APPROVE" | "REJECT") {
    if (!auth?.token || !auth.activeTuntasId || actionBusy) return;
    const successorUserId = selectedSuccessors[requestId];
    if (action === "APPROVE" && !successorUserId) {
      setError("Pasirinkite naują vieneto vadovą.");
      return;
    }
    setActionBusy(requestId);
    setError(null);
    setActionMessage(null);
    try {
      await api.reviewLeadershipChangeRequest(auth.token, auth.activeTuntasId, requestId, {
        action,
        successorUserId: action === "APPROVE" ? successorUserId : null
      });
      setLeadershipRequests((current) => current.filter((request) => request.id !== requestId));
      setActionMessage(action === "APPROVE" ? "Vadovo pasikeitimas patvirtintas." : "Vadovo pasikeitimo prašymas atmestas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Vadovo pasikeitimo peržiūrėti nepavyko.");
    } finally {
      setActionBusy(null);
    }
  }

  const actions = (
    <button
      className="secondary-button"
      type="button"
      onClick={() => setReloadKey((value) => value + 1)}
      disabled={!canFetch || isLoading}
    >
      <RefreshCw size={17} aria-hidden="true" />
      Atnaujinti
    </button>
  );

  return (
    <SkautaiPageShell
      className="collection-page tasks-page"
      eyebrow="Darbo erdvė"
      title="Mano užduotys"
      description={`${combinedTotal} ${combinedTotal === 1 ? "aktyvi užduotis" : "aktyvios užduotys"}. Tvirtinimai, vadovų pasikeitimai, grąžinimai ir renginių darbai vienoje eilėje.`}
      actions={actions}
    >

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {actionMessage && <p className="inline-success">{actionMessage}</p>}

      <div className="inner-page-grid">
        <div className="data-panel">
          <div className="data-panel-header">
            <span>Mano darbo eilė</span>
            <span>{formatDateTime(new Date().toISOString())}</span>
          </div>

          {isLoading && (
            <div className="table-state">
              <Loader2 className="spin" size={22} aria-hidden="true" />
              Kraunamos užduotys...
            </div>
          )}

          {!isLoading && !error && combinedTotal === 0 && (
            <div className="empty-state">
              <CheckCircle2 size={28} aria-hidden="true" />
              <strong>Aktyvių užduočių nėra</strong>
              <span>Kai atsiras tvirtinimų, grąžinimų ar renginių darbų, jie bus rodomi čia.</span>
            </div>
          )}

          {!isLoading && !error && leadershipRequests.length > 0 && <LeadershipChangeReviewSection
            requests={leadershipRequests}
            members={members}
            selectedSuccessors={selectedSuccessors}
            busyId={actionBusy}
            onSuccessorChange={(requestId, userId) => setSelectedSuccessors((current) => ({ ...current, [requestId]: userId }))}
            onReview={reviewLeadershipChange}
          />}

          {!isLoading && !error && total > 0 && (
            <div className="task-board">
              {bucketOrder
                .filter((bucket) => groupedTasks[bucket]?.length)
                .map((bucket) => (
                  <section className="task-bucket" key={bucket}>
                    <h3>{taskBucketLabel(bucket)}</h3>
                    <div className="task-list">
                      {groupedTasks[bucket].map((task) => (
                        <TaskRow task={task} key={task.id} />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </div>

        <aside className="side-panel-stack">
          <section className="side-panel">
            <div className="side-panel-heading">
              <ClipboardCheck size={18} aria-hidden="true" />
              <h3>Darbo būsena</h3>
            </div>
            <div className="side-stat-list">
              <SideStat label="Aktyvios" value={combinedTotal} />
              <SideStat label="Skubios" value={urgentCount} />
              <SideStat label="Su terminu" value={dueCount} />
              <SideStat label="Vadovų pasikeitimai" value={leadershipRequests.length} />
            </div>
          </section>

          <section className="side-panel">
            <div className="side-panel-heading">
              <CalendarDays size={18} aria-hidden="true" />
              <h3>Artimiausi veiksmai</h3>
            </div>
            {tasks.filter((task) => task.dueAt).slice(0, 4).length > 0 ? (
              <div className="mini-action-list">
                {tasks.filter((task) => task.dueAt).slice(0, 4).map((task) => (
                  <Link key={task.id} to={taskRoutePath(task.routeTarget, task.entityId)}>
                    <TimerReset size={16} aria-hidden="true" />
                    <span>{task.title}</span>
                    <small>{formatDateTime(task.dueAt)}</small>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="side-panel-muted">Šiuo metu nėra užduočių su konkrečiu terminu.</p>
            )}
          </section>
        </aside>
      </div>
    </SkautaiPageShell>
  );
}

function LeadershipChangeReviewSection({ requests, members, selectedSuccessors, busyId, onSuccessorChange, onReview }: {
  requests: LeadershipChangeRequest[];
  members: Member[];
  selectedSuccessors: Record<string, string>;
  busyId: string | null;
  onSuccessorChange: (requestId: string, userId: string) => void;
  onReview: (requestId: string, action: "APPROVE" | "REJECT") => void;
}) {
  return <section className="leadership-review-section">
    <div className="form-section-heading"><UsersRound size={20} /><div><h3>Vadovų pasikeitimai</h3><span>Pasirinkite pakeitėją iš to paties vieneto aktyvių narių.</span></div></div>
    <div className="leadership-review-grid">{requests.map((request) => {
      const candidates = members.filter((member) => member.userId !== request.requesterUserId && !member.isIdentityHidden && (member.unitAssignments ?? []).some((assignment) => assignment.organizationalUnitId === request.organizationalUnitId));
      return <article className="leadership-review-card" key={request.id}>
        <div><strong>{request.requesterName} nori atsistatydinti</strong><span>{request.organizationalUnitName} · {request.roleName}</span>{request.reason && <p>{request.reason}</p>}</div>
        {candidates.length === 0 ? <p className="inline-alert compact-alert">Šiame vienete nėra kito tinkamo nario. Pirmiausia pridėkite arba perkelkite narį.</p> : <label className="form-field"><span>Naujas vadovas *</span><select value={selectedSuccessors[request.id] ?? ""} onChange={(event) => onSuccessorChange(request.id, event.target.value)} disabled={busyId === request.id}><option value="">Pasirinkite</option>{candidates.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{memberName(candidate)}</option>)}</select></label>}
        <div className="row-actions"><button className="secondary-button" type="button" disabled={Boolean(busyId)} onClick={() => onReview(request.id, "REJECT")}><XCircle size={16} />Atmesti</button><button className="primary-button compact-primary-button" type="button" disabled={Boolean(busyId) || candidates.length === 0 || !selectedSuccessors[request.id]} onClick={() => onReview(request.id, "APPROVE")}><UserRoundCheck size={16} />Patvirtinti pakeitėją</button></div>
      </article>;
    })}</div>
  </section>;
}

function memberName(member: Member) {
  return [member.name, member.surname].filter(Boolean).join(" ") || member.email;
}

function TaskRow({ task }: { task: MyTask }) {
  return (
    <Link className={`task-row urgency-${task.urgency.toLowerCase()}`} to={taskRoutePath(task.routeTarget, task.entityId)}>
      <ClipboardCheck size={18} aria-hidden="true" />
      <div className="task-row-main">
        <strong>{task.title}</strong>
        <span>{task.subtitle}</span>
        {task.dueAt && <small>Terminas: {formatDateTime(task.dueAt)}</small>}
      </div>
      <div className="task-row-meta">
        {task.count != null && <strong>{task.count}</strong>}
        <span>{taskUrgencyLabel(task.urgency)}</span>
      </div>
    </Link>
  );
}

function SideStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function groupTasks(tasks: MyTask[]) {
  return tasks.reduce<Record<string, MyTask[]>>((groups, task) => {
    groups[task.bucket] = groups[task.bucket] ?? [];
    groups[task.bucket].push(task);
    return groups;
  }, {});
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
