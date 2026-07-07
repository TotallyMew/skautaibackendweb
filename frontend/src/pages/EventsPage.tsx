import { CalendarDays } from "lucide-react";
import { WorkArea } from "./WorkArea";

export function EventsPage() {
  return (
    <WorkArea
      icon={CalendarDays}
      title="Renginiai"
      description="Cia bus renginiai, inventoriaus planavimas, pirkimai, pastovykles, sutikrinimas ir judejimo ekranai."
    />
  );
}

