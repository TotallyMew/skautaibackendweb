import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, TimerReset } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { MyTask, MyTaskListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiPageShell } from "../components/ui/Skautai";
import { taskBucketLabel, taskRoutePath, taskUrgencyLabel } from "../utils/tasks";

const bucketOrder = ["URGENT", "TODAY", "NEXT", "WATCH"];

export function MyTasksPage() {
  const { auth } = useAuth();
  const [tasksState, setTasksState] = useState<MyTaskListResponse | null>(null);
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

    api
      .listMyTasks(auth.token, auth.activeTuntasId)
      .then((response) => {
        if (!isCancelled) {
          setTasksState(response);
        }
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Nepavyko įkelti užduočių.");
          setTasksState(null);
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

  const tasks = tasksState?.tasks ?? [];
  const groupedTasks = useMemo(() => groupTasks(tasks), [tasks]);
  const total = tasksState?.total ?? 0;
  const urgentCount = tasks.filter((task) => task.urgency === "HIGH" || task.bucket === "URGENT").length;
  const dueCount = tasks.filter((task) => Boolean(task.dueAt)).length;

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
      description={`${total} ${total === 1 ? "aktyvi užduotis" : "aktyvios užduotys"}. Tvirtinimai, grąžinimai ir renginių darbai vienoje eilėje.`}
      actions={actions}
    >

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

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

          {!isLoading && !error && total === 0 && (
            <div className="empty-state">
              <CheckCircle2 size={28} aria-hidden="true" />
              <strong>Aktyvių užduočių nėra</strong>
              <span>Kai atsiras tvirtinimų, grąžinimų ar renginių darbų, jie bus rodomi čia.</span>
            </div>
          )}

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
              <SideStat label="Aktyvios" value={total} />
              <SideStat label="Skubios" value={urgentCount} />
              <SideStat label="Su terminu" value={dueCount} />
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
