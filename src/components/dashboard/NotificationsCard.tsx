import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  status: "success" | "warning" | "danger" | "info";
}

const statuses = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-sky-100 text-sky-700",
};

const NotificationsCard = ({ items }: { items: NotificationItem[] }) => (
  <section aria-label="Notifications" className="flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
    <h2 className="mb-3 text-sm font-semibold text-foreground">Notifications</h2>
    {items.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
    ) : (
      <ul className="divide-y divide-border">
        {items.map((n) => (
          <li key={n.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", statuses[n.status])}>
              <n.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.description}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default NotificationsCard;
