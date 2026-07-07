import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { MyTask, MyTaskListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
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

  const groupedTasks = useMemo(() => groupTasks(tasksState?.tasks ?? []), [tasksState?.tasks]);
  const total = tasksState?.total ?? 0;

  return (
    <section className="inventory-page">
      <div className="section-toolbar">
        <div className="list-summary">
          <strong>{total}</strong>
          <span>{total === 1 ? "užduotis" : "užduotys"}</span>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={!canFetch || isLoading}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Atnaujinti
        </button>
      </div>

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

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
    </section>
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

function groupTasks(tasks: MyTask[]) {
  return tasks.reduce<Record<string, MyTask[]>>((groups, task) => {
    groups[task.bucket] = groups[task.bucket] ?? [];
    groups[task.bucket].push(task);
    return groups;
  }, {});
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
