import { ClipboardList } from "lucide-react";
import { WorkArea } from "./WorkArea";

export function RequestsPage() {
  return (
    <WorkArea
      icon={ClipboardList}
      title="Prasymai ir rezervacijos"
      description="Cia bus rezervacijos, pirkimu paraiskos, bendro inventoriaus prasymai, tvirtinimai ir isdavimo/grazinimo eiga."
    />
  );
}

