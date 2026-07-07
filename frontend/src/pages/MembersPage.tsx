import { UsersRound } from "lucide-react";
import { WorkArea } from "./WorkArea";

export function MembersPage() {
  return (
    <WorkArea
      icon={UsersRound}
      title="Nariai ir vienetai"
      description="Cia bus nariai, organizaciniai vienetai, roles, laipsniai, pakvietimai ir vadovu pasikeitimai."
    />
  );
}

