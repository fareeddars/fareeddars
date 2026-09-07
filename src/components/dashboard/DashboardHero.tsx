import { Leaf } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  name: string;
  seasons: { id: string; name: string; status: string }[];
  selectedSeasonId?: string;
  onSeasonChange: (id: string) => void;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const DashboardHero = ({ name, seasons, selectedSeasonId, onSeasonChange }: Props) => (
  <section className="relative overflow-hidden rounded-lg border border-border shadow-lg">
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/hero_farmland.jpg')" }}
      aria-hidden="true"
    />
    <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/40" aria-hidden="true" />
    <div className="relative z-10 p-5 sm:p-6 lg:p-7">
      <p className="text-xs sm:text-sm font-medium text-primary-foreground/80">{greeting()},</p>
      <h1 className="mt-0.5 text-2xl sm:text-3xl font-bold tracking-tight text-primary-foreground">
        {name} <span aria-hidden="true">👋</span>
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-primary-foreground/75">
        Here's what's happening with your farm today.
      </p>

      {seasons.length > 0 && (
        <div className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-background/90 px-3 py-1.5 backdrop-blur">
          <Leaf className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground">Current Season</span>
          <Select value={selectedSeasonId ?? ""} onValueChange={onSeasonChange}>
            <SelectTrigger
              aria-label="Select current season"
              className="h-7 min-h-[28px] w-auto gap-1 border-0 bg-transparent px-1 text-sm font-semibold text-foreground shadow-none focus:ring-0"
            >
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.status === "active" ? "🟢" : "🔒"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  </section>
);

export default DashboardHero;
