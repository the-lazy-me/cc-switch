import { useTranslation } from "react-i18next";
import { MonitorCog, ShieldCheck, ShieldOff } from "lucide-react";
import type { AppId } from "@/lib/api";
import type { SettingsFormState } from "@/hooks/useSettings";
import { ToggleRow } from "@/components/ui/toggle-row";

interface TakeoverSettingsProps {
  settings: SettingsFormState;
  onChange: (updates: Partial<SettingsFormState>) => void;
}

const APP_ORDER: AppId[] = ["claude", "codex", "gemini", "opencode", "openclaw"];

const APP_COLORS: Record<AppId, string> = {
  claude: "text-orange-500",
  codex: "text-green-500",
  gemini: "text-blue-500",
  opencode: "text-cyan-500",
  openclaw: "text-emerald-500",
};

export function TakeoverSettings({ settings, onChange }: TakeoverSettingsProps) {
  const { t } = useTranslation();

  const takeoverApps = settings.takeoverApps ?? {
    claude: true,
    codex: true,
    gemini: true,
    opencode: true,
    openclaw: true,
  };

  const handleToggle = (appId: AppId, enabled: boolean) => {
    onChange({
      takeoverApps: {
        ...takeoverApps,
        [appId]: enabled,
      },
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border/40">
        <MonitorCog className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">{t("settings.takeover.title")}</h3>
      </div>

      <p className="text-xs text-muted-foreground">{t("settings.takeover.description")}</p>

      <div className="space-y-3">
        {APP_ORDER.map((appId) => {
          const enabled = takeoverApps[appId];
          const iconClass = APP_COLORS[appId];

          return (
            <ToggleRow
              key={appId}
              icon={
                enabled ? (
                  <ShieldCheck className={`h-4 w-4 ${iconClass}`} />
                ) : (
                  <ShieldOff className={`h-4 w-4 ${iconClass}`} />
                )
              }
              title={t(`apps.${appId}`)}
              description={t(
                enabled
                  ? "settings.takeover.enabledDescription"
                  : "settings.takeover.disabledDescription",
              )}
              checked={enabled}
              onCheckedChange={(value) => handleToggle(appId, value)}
            />
          );
        })}
      </div>
    </section>
  );
}
