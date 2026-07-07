import { ShieldCheck } from "lucide-react";
import { WorkArea } from "./WorkArea";

export function AdminPage() {
  return (
    <WorkArea
      icon={ShieldCheck}
      title="Administravimas"
      description="Čia bus vyriausiojo administratoriaus darbo vieta, tuntų tvirtinimas, pranešimai ir bendri sistemos nustatymai."
    />
  );
}
