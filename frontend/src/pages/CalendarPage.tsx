import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Event, Reservation } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiEmptyState, SkautaiErrorState, SkautaiPageShell, SkautaiStatusPill } from "../components/ui/Skautai";
import { countLabel, statusLabel } from "../utils/display";

type CalendarEntry = {
  id: string;
  kind: "event" | "reservation";
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  date: string;
};

export function CalendarPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) return;
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      api.listEvents(auth.token, auth.activeTuntasId, { limit: 250 }),
      api.listReservations(auth.token, auth.activeTuntasId, { limit: 250 })
    ])
      .then(([eventsResult, reservationsResult]) => {
        if (isCancelled) return;
        if (eventsResult.status === "fulfilled") setEvents(eventsResult.value.events);
        if (reservationsResult.status === "fulfilled") setReservations(reservationsResult.value.reservations);
        if (eventsResult.status === "rejected" && reservationsResult.status === "rejected") {
          setError("Kalendoriaus duomenų užkrauti nepavyko.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, reloadKey]);

  const monthEntries = useMemo(
    () => buildEntries(events, reservations, selectedMonth),
    [events, reservations, selectedMonth]
  );
  const entriesByDate = useMemo(() => groupByDate(monthEntries), [monthEntries]);
  const selectedEntries = entriesByDate.get(selectedDate) ?? [];
  const weeks = useMemo(() => calendarWeeks(selectedMonth), [selectedMonth]);
  const monthItemCount = useMemo(
    () => new Set(monthEntries.map((entry) => `${entry.kind}-${entry.id}`)).size,
    [monthEntries]
  );

  function moveMonth(delta: number) {
    const next = addMonths(selectedMonth, delta);
    setSelectedMonth(next);
    setSelectedDate(`${next}-01`);
  }

  function goToday() {
    const today = new Date();
    setSelectedMonth(monthKey(today));
    setSelectedDate(dateKey(today));
  }

  function openEntry(entry: CalendarEntry) {
    if (entry.kind === "event") navigate(`/events/${entry.id}`);
    else navigate(`/reservations/${entry.id}`);
  }

  const actions = (
    <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading}>
      <RefreshCw size={16} aria-hidden="true" />
      Atnaujinti
    </button>
  );

  return (
    <SkautaiPageShell
      className="calendar-page"
      eyebrow="Planavimas"
      title="Kalendorius"
      description="Renginiai ir inventoriaus rezervacijos vienoje mėnesio apžvalgoje."
      actions={actions}
      width="wide"
    >
      {error && <SkautaiErrorState description={error} />}

      <div className="calendar-layout">
        <section className="data-panel calendar-board-panel">
          <div className="calendar-toolbar">
            <button className="icon-button" type="button" onClick={() => moveMonth(-1)} aria-label="Ankstesnis mėnuo" title="Ankstesnis mėnuo">
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <div className="calendar-month-copy">
              <strong>{monthTitle(selectedMonth)}</strong>
              <span>{monthItemCount} {countLabel(monthItemCount, "įrašas", "įrašai", "įrašų")}</span>
            </div>
            <button className="secondary-button calendar-today-button" type="button" onClick={goToday}>Šiandien</button>
            <button className="icon-button" type="button" onClick={() => moveMonth(1)} aria-label="Kitas mėnuo" title="Kitas mėnuo">
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="calendar-grid-scroll">
            <div className="calendar-weekdays">
              {["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="calendar-grid">
              {weeks.flat().map((day, index) => {
                const key = day ?? `empty-${index}`;
                const dayEntries = day ? entriesByDate.get(day) ?? [] : [];
                return (
                  <button
                    key={key}
                    className={`calendar-day${day === selectedDate ? " selected" : ""}${day === dateKey(new Date()) ? " today" : ""}${dayEntries.length > 0 ? " has-entries" : ""}`}
                    type="button"
                    disabled={!day}
                    aria-label={day ? formatSelectedDate(day) : undefined}
                    onClick={() => day && setSelectedDate(day)}
                  >
                    {day && <strong>{Number(day.slice(8, 10))}</strong>}
                    <span>
                      {dayEntries.slice(0, 3).map((entry) => (
                        <i className={`calendar-entry-chip kind-${entry.kind}`} key={`${entry.kind}-${entry.id}`}>{entry.title}</i>
                      ))}
                      {dayEntries.length > 3 && <i className="calendar-more-chip">+{dayEntries.length - 3}</i>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="data-panel calendar-day-panel">
          <div className="calendar-selected-heading">
            <div>
              <span>Pasirinkta diena</span>
              <strong>{formatSelectedDate(selectedDate)}</strong>
            </div>
            {isLoading && <Loader2 className="spin-icon" size={18} aria-hidden="true" />}
          </div>
          {selectedEntries.length === 0 ? (
            <SkautaiEmptyState compact icon={CalendarDays} title="Nėra įrašų" description="Pasirinktą dieną nėra renginių ar rezervacijų." />
          ) : (
            <div className="calendar-entry-list">
              {selectedEntries.map((entry) => (
                <button key={`${entry.kind}-${entry.id}`} className="calendar-entry-row" type="button" onClick={() => openEntry(entry)}>
                  <span className={`calendar-entry-kind kind-${entry.kind}`}>
                    {entry.kind === "event" ? "Renginys" : "Rezervacija"}
                  </span>
                  <span className="calendar-entry-copy">
                    <strong>{entry.title}</strong>
                    <small>{formatDateRange(entry.startDate, entry.endDate)}</small>
                  </span>
                  <SkautaiStatusPill status={entry.status} tone={calendarStatusTone(entry.status)}>{statusLabel(entry.status)}</SkautaiStatusPill>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </SkautaiPageShell>
  );
}

function buildEntries(events: Event[], reservations: Reservation[], month: string): CalendarEntry[] {
  const start = `${month}-01`;
  const end = monthEnd(month);
  const eventEntries = events.flatMap((event) =>
    datesBetween(event.startDate, event.endDate, start, end).map((date) => ({
      id: event.id,
      kind: "event" as const,
      title: event.name,
      startDate: event.startDate.slice(0, 10),
      endDate: event.endDate.slice(0, 10),
      status: event.status,
      date
    }))
  );
  const reservationEntries = reservations.filter((reservation) => !reservation.eventId).flatMap((reservation) =>
    datesBetween(reservation.startDate, reservation.endDate, start, end).map((date) => ({
      id: reservation.id,
      kind: "reservation" as const,
      title: reservation.title,
      startDate: reservation.startDate.slice(0, 10),
      endDate: reservation.endDate.slice(0, 10),
      status: reservation.status,
      date
    }))
  );
  return [...eventEntries, ...reservationEntries].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function groupByDate(entries: CalendarEntry[]) {
  const grouped = new Map<string, CalendarEntry[]>();
  entries.forEach((entry) => grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]));
  return grouped;
}

function calendarWeeks(month: string) {
  const first = parseLocalDate(`${month}-01`);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const cells: Array<string | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`)
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

function datesBetween(rawStart: string, rawEnd: string, rangeStart: string, rangeEnd: string) {
  const start = maxDate(rawStart.slice(0, 10), rangeStart);
  const end = minDate((rawEnd || rawStart).slice(0, 10), rangeEnd);
  if (start > end) return [];
  const dates: string[] = [];
  const cursor = parseLocalDate(start);
  const last = parseLocalDate(end);
  while (cursor <= last) {
    dates.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return dateKey(date).slice(0, 7);
}

function addMonths(month: string, delta: number) {
  const date = parseLocalDate(`${month}-01`);
  date.setMonth(date.getMonth() + delta);
  return monthKey(date);
}

function monthEnd(month: string) {
  const date = parseLocalDate(`${month}-01`);
  return dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function maxDate(a: string, b: string) {
  return a > b ? a : b;
}

function minDate(a: string, b: string) {
  return a < b ? a : b;
}

function monthTitle(month: string) {
  const date = parseLocalDate(`${month}-01`);
  return new Intl.DateTimeFormat("lt-LT", { month: "long", year: "numeric" }).format(date);
}

function formatSelectedDate(value: string) {
  const date = parseLocalDate(value);
  return new Intl.DateTimeFormat("lt-LT", { weekday: "long", month: "long", day: "numeric" }).format(date);
}

function formatDateRange(start: string, end: string) {
  const formattedStart = new Intl.DateTimeFormat("lt-LT", { month: "short", day: "numeric" }).format(parseLocalDate(start));
  const formattedEnd = new Intl.DateTimeFormat("lt-LT", { month: "short", day: "numeric" }).format(parseLocalDate(end));
  return start === end ? formattedStart : `${formattedStart}–${formattedEnd}`;
}

function calendarStatusTone(status: string): "success" | "warning" | "danger" | "muted" | "info" {
  if (["ACTIVE", "APPROVED", "COMPLETED", "RETURNED"].includes(status)) return "success";
  if (["PENDING", "PLANNING", "WRAP_UP"].includes(status)) return "warning";
  if (["REJECTED", "CANCELLED"].includes(status)) return "danger";
  return "muted";
}
