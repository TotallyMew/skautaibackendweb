import type { LucideIcon } from "lucide-react";

type WorkAreaProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function WorkArea({ icon: Icon, title, description }: WorkAreaProps) {
  return (
    <section className="work-area">
      <Icon size={34} aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}

