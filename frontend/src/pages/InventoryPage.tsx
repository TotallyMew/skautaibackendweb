import { PackageSearch } from "lucide-react";
import { WorkArea } from "./WorkArea";

export function InventoryPage() {
  return (
    <WorkArea
      icon={PackageSearch}
      title="Inventorius"
      description="Cia bus keliami inventoriaus sarasai, detales, kurimas, redagavimas, QR paieska, lokacijos, rinkiniai ir auditas."
    />
  );
}

