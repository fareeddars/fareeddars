import { useNavigate } from "react-router-dom";
import FarmerAvatar from "@/components/FarmerAvatar";
import { Button } from "@/components/ui/button";
import type { OutstandingRow } from "@/hooks/useDashboardData";

const money = (n: number) => `Rs ${Math.round(n).toLocaleString()}`;

const OutstandingCard = ({ rows, total }: { rows: OutstandingRow[]; total: number }) => {
  const navigate = useNavigate();
  return (
    <section aria-label="Outstanding balances" className="flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Outstanding Balances</h2>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate("/farmers")}>
          View all
        </Button>
      </header>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No outstanding balances.</p>
      ) : (
        <ul className="space-y-1">
          {rows.slice(0, 5).map((r) => (
            <li key={r.farmerId} className="flex items-center gap-3 rounded-xl px-1.5 py-2 transition-colors hover:bg-muted/60">
              <FarmerAvatar name={r.name} photoUrl={r.photoUrl} className="h-9 w-9" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{r.name}</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{money(r.amount)}</span>
              <span className="w-16 shrink-0 text-right text-xs font-medium text-destructive">{r.days} days</span>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-auto flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="font-semibold text-foreground">Total Outstanding</span>
        <span className="font-bold tabular-nums text-destructive">{money(total)}</span>
      </footer>
    </section>
  );
};

export default OutstandingCard;
