import { useNavigate } from "react-router-dom";
import {
  BarChart3, Boxes, FileText, HandCoins, Leaf, LucideIcon, PiggyBank, Plus,
  Receipt, ShoppingCart, UserPlus, Wallet,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tileClass =
  "flex min-h-[88px] min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-2 py-3 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const Tile = ({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className={tileClass} aria-label={label}>
    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
    <span className="text-xs font-medium text-foreground">{label}</span>
  </button>
);

const transactions: { label: string; description: string; tab: string; icon: LucideIcon }[] = [
  { label: "Add Sale", description: "Record sale transaction", tab: "sale", icon: ShoppingCart },
  { label: "Add Expense", description: "Record expense transaction", tab: "expense", icon: Receipt },
  { label: "Add Payment", description: "Record payment received", tab: "payment", icon: Wallet },
  { label: "Add Loan Given", description: "Loan given to farmer", tab: "loan", icon: HandCoins },
  { label: "Add Loan Received", description: "Loan received from farmer", tab: "loan", icon: PiggyBank },
];

const QuickActions = () => {
  const navigate = useNavigate();
  const openLedger = (tab: string) => navigate("/ledger", { state: { openEntry: true, tab } });

  return (
    <section
      aria-label="Quick actions"
      className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm"
    >
      <h2 className="mb-3 text-sm font-semibold text-foreground">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
        <Tile icon={UserPlus} label="Add Farmer" onClick={() => navigate("/farmers", { state: { openAdd: true } })} />

        <DropdownMenu>
          <DropdownMenuTrigger className={tileClass} aria-label="New transaction">
            <Plus className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-xs font-medium text-foreground">New Transaction</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-popover">
            <DropdownMenuLabel>New Transaction</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {transactions.map((tx) => (
              <DropdownMenuItem key={tx.label} onSelect={() => openLedger(tx.tab)} className="gap-3 py-2.5">
                <tx.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{tx.label}</span>
                  <span className="text-xs text-muted-foreground">{tx.description}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tile icon={Boxes} label="Add Inventory" onClick={() => navigate("/inventory", { state: { openAdd: true } })} />
        <Tile icon={FileText} label="Generate Bill" onClick={() => navigate("/reports")} />
        <Tile icon={BarChart3} label="View Reports" onClick={() => navigate("/profit-loss")} />
        <Tile icon={Leaf} label="Season Details" onClick={() => navigate("/seasons")} />
      </div>
    </section>
  );
};

export default QuickActions;
