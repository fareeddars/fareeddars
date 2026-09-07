import { useNavigate } from "react-router-dom";
import { AlertTriangle, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface InventoryAlert {
  id: string;
  name: string;
  stock: number;
  unit: string;
  level: "low" | "out";
}

const InventoryAlertsCard = ({ alerts }: { alerts: InventoryAlert[] }) => {
  const navigate = useNavigate();
  return (
    <section aria-label="Inventory alerts" className="flex flex-col rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Inventory Alerts</h2>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate("/inventory")}>
          View all
        </Button>
      </header>

      {alerts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">All stock levels are healthy.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.slice(0, 4).map((a) => {
            const out = a.level === "out";
            return (
              <li
                key={a.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                  out ? "border-destructive/30 bg-destructive/10" : "border-amber-300/60 bg-amber-50"
                )}
              >
                <span className={cn("mt-0.5", out ? "text-destructive" : "text-amber-600")}>
                  {out ? <PackageX className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {a.name} — {out ? "Out of Stock" : "Low Stock"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {out ? "Refill required immediately" : `Only ${a.stock} ${a.unit} left`}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    out ? "bg-destructive/15 text-destructive" : "bg-amber-200 text-amber-800"
                  )}
                >
                  {out ? "Out" : "Low"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default InventoryAlertsCard;
