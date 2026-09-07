import { User, Lock, Globe, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SettingsSectionId = "profile" | "security" | "language";

export interface SettingsNavItem {
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const settingsNavItems: SettingsNavItem[] = [
  { id: "profile", title: "Profile", description: "Manage your profile information", icon: User },
  { id: "security", title: "Security", description: "Change your password", icon: Lock },
  { id: "language", title: "Language", description: "Choose your preferred language", icon: Globe },
];

interface Props {
  active: SettingsSectionId;
  onChange: (id: SettingsSectionId) => void;
}

const SettingsNav = ({ active, onChange }: Props) => {
  return (
    <>
      {/* Mobile: dropdown */}
      <div className="lg:hidden">
        <label htmlFor="settings-section" className="sr-only">
          Settings section
        </label>
        <Select value={active} onValueChange={(v) => onChange(v as SettingsSectionId)}>
          <SelectTrigger id="settings-section" className="h-12 rounded-xl bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settingsNavItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: vertical nav */}
      <nav
        aria-label="Settings sections"
        className="hidden lg:block rounded-lg border border-border/70 bg-card p-2 shadow-sm"
      >
        <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Settings
        </p>
        <ul className="space-y-1">
          {settingsNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onChange(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors min-h-11",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/60"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-lg p-1.5 transition-colors",
                      isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

export default SettingsNav;
