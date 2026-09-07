import React from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "primary" | "danger";
  children: React.ReactNode;
}

const SettingsSection = ({ icon: Icon, title, description, tone = "primary", children }: Props) => (
  <Card className="rounded-lg border-border/70 bg-card shadow-sm">
    <CardHeader className="gap-1 pb-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "shrink-0 rounded-xl p-2.5",
            tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
);

export default SettingsSection;
