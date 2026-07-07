import { ShieldCheck } from "lucide-react";
import { WorkArea } from "./WorkArea";

export function AdminPage() {
  return (
    <WorkArea
      icon={ShieldCheck}
      title="Administravimas"
      description="Cia bus superadmin, tuntu tvirtinimas, pranesimai, globalus nustatymai ir administravimo darbo vietos."
    />
  );
}

