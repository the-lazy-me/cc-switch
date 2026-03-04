import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Zap, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ApiKeyInput from "@/components/providers/forms/ApiKeyInput";
import { providerPresets } from "@/config/claudeProviderPresets";
import { codexProviderPresets } from "@/config/codexProviderPresets";
import { geminiProviderPresets } from "@/config/geminiProviderPresets";
import { opencodeProviderPresets } from "@/config/opencodeProviderPresets";
import {
  openclawProviderPresets,
  type OpenClawSuggestedDefaults,
} from "@/config/openclawProviderPresets";
import type { Provider } from "@/types";
import { settingsApi, type AppId } from "@/lib/api";

type Region = "cn" | "hk";

const REGIONS: Record<
  Region,
  {
    label: string;
    apiBase: string;
    apiBaseV1: string;
    apiKeyUrl: string;
    testUrl: string;
  }
> = {
  cn: {
    label: "国际线路",
    apiBase: "https://api.qhaigc.net",
    apiBaseV1: "https://api.qhaigc.net/v1",
    apiKeyUrl: "https://www.qhaigc.net/console/apikeys",
    testUrl: "https://api.qhaigc.net",
  },
  hk: {
    label: "香港线路",
    apiBase: "https://api-hk.qhaigc.net",
    apiBaseV1: "https://api-hk.qhaigc.net/v1",
    apiKeyUrl: "https://www-hk.qhaigc.net/console/apikeys",
    testUrl: "https://api-hk.qhaigc.net",
  },
};

const QHAI_API_V1_PATTERN = /https:\/\/api(?:-hk)?\.qhaigc\.net\/v1/g;
const QHAI_API_PATTERN = /https:\/\/api(?:-hk)?\.qhaigc\.net/g;

function replaceQhaiBaseUrl(
  value: string,
  apiBase: string,
  apiBaseV1: string,
): string {
  return value
    .replace(QHAI_API_V1_PATTERN, apiBaseV1)
    .replace(QHAI_API_PATTERN, apiBase);
}

type FirstRunSubmitPayload = Omit<Provider, "id"> & {
  providerKey?: string;
  suggestedDefaults?: OpenClawSuggestedDefaults;
};

async function measureLatency(url: string, timeoutMs = 5000): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    await fetch(url, {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
      cache: "no-store",
    });
    return Date.now() - start;
  } catch {
    return Infinity;
  } finally {
    clearTimeout(timer);
  }
}

interface FirstRunSetupDialogProps {
  open: boolean;
  appId: AppId;
  onSubmit: (provider: FirstRunSubmitPayload) => Promise<void> | void;
}

export function FirstRunSetupDialog({
  open,
  appId,
  onSubmit,
}: FirstRunSetupDialogProps) {
  const { t } = useTranslation();

  const [region, setRegion] = useState<Region>("cn");
  const [apiKey, setApiKey] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [latencies, setLatencies] = useState<Partial<Record<Region, number>>>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAutoDetect = useCallback(async () => {
    setDetecting(true);
    setLatencies({});
    const [cnLatency, hkLatency] = await Promise.all([
      measureLatency(REGIONS.cn.testUrl),
      measureLatency(REGIONS.hk.testUrl),
    ]);
    const result: Partial<Record<Region, number>> = {
      cn: cnLatency,
      hk: hkLatency,
    };
    setLatencies(result);
    const best = cnLatency <= hkLatency ? "cn" : "hk";
    setRegion(best);
    setDetecting(false);
  }, []);

  const handleOpenUrl = useCallback(async (url: string) => {
    try {
      await settingsApi.openExternal(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setError(
        t("firstRun.apiKeyRequired", { defaultValue: "请输入 API Key" }),
      );
      return;
    }
    setError("");
    setSaving(true);
    try {
      const selectedRegion = REGIONS[region];
      const selectedWebsiteUrl = selectedRegion.apiBase.includes("-hk.")
        ? "https://www-hk.qhaigc.net"
        : "https://www.qhaigc.net";
      let payload: FirstRunSubmitPayload | null = null;

      if (appId === "claude") {
        const preset = providerPresets[0];
        if (!preset) {
          throw new Error("missing claude preset");
        }
        const presetEnv =
          (preset.settingsConfig as { env?: Record<string, unknown> }).env ??
          {};
        payload = {
          name: preset.name,
          websiteUrl: selectedWebsiteUrl,
          settingsConfig: {
            env: {
              ...presetEnv,
              ANTHROPIC_BASE_URL: selectedRegion.apiBase,
              ANTHROPIC_AUTH_TOKEN: trimmedApiKey,
            },
          },
          category: preset.category,
          icon: preset.icon,
          iconColor: preset.iconColor,
        };
      } else if (appId === "codex") {
        const preset = codexProviderPresets[0];
        if (!preset) {
          throw new Error("missing codex preset");
        }
        payload = {
          name: preset.name,
          websiteUrl: selectedWebsiteUrl,
          settingsConfig: {
            auth: {
              ...(preset.auth ?? {}),
              OPENAI_API_KEY: trimmedApiKey,
            },
            config: replaceQhaiBaseUrl(
              preset.config ?? "",
              selectedRegion.apiBase,
              selectedRegion.apiBaseV1,
            ),
          },
          category: preset.category,
          icon: preset.icon,
          iconColor: preset.iconColor,
        };
      } else if (appId === "gemini") {
        const preset = geminiProviderPresets[0];
        if (!preset) {
          throw new Error("missing gemini preset");
        }
        const settingsConfig =
          (preset.settingsConfig as Record<string, unknown>) ?? {};
        const env =
          (settingsConfig.env as Record<string, unknown> | undefined) ?? {};
        payload = {
          name: preset.name,
          websiteUrl: selectedWebsiteUrl,
          settingsConfig: {
            ...settingsConfig,
            env: {
              ...env,
              GOOGLE_GEMINI_BASE_URL: selectedRegion.apiBase,
              GEMINI_API_KEY: trimmedApiKey,
            },
          },
          category: preset.category,
          icon: preset.icon,
          iconColor: preset.iconColor,
        };
      } else if (appId === "opencode") {
        const preset = opencodeProviderPresets[0];
        if (!preset) {
          throw new Error("missing opencode preset");
        }
        const options =
          (preset.settingsConfig.options as Record<string, unknown>) ?? {};
        payload = {
          name: preset.name,
          websiteUrl: selectedWebsiteUrl,
          settingsConfig: {
            ...preset.settingsConfig,
            options: {
              ...options,
              baseURL: selectedRegion.apiBaseV1,
              apiKey: trimmedApiKey,
            },
          },
          category: preset.category,
          icon: preset.icon,
          iconColor: preset.iconColor,
          providerKey: "qihanai",
        };
      } else if (appId === "openclaw") {
        const preset = openclawProviderPresets[0];
        if (!preset) {
          throw new Error("missing openclaw preset");
        }
        payload = {
          name: preset.name,
          websiteUrl: selectedWebsiteUrl,
          settingsConfig: {
            ...preset.settingsConfig,
            baseUrl: selectedRegion.apiBaseV1,
            apiKey: trimmedApiKey,
          },
          category: preset.category,
          icon: preset.icon,
          iconColor: preset.iconColor,
          providerKey: "qihanai",
          suggestedDefaults: preset.suggestedDefaults,
        };
      }

      if (!payload) {
        throw new Error(`unsupported appId: ${appId}`);
      }

      await onSubmit(payload);
    } catch {
      setError(
        t("firstRun.saveFailed", { defaultValue: "保存失败，请重试" }),
      );
    } finally {
      setSaving(false);
    }
  }, [apiKey, appId, region, onSubmit, t]);

  const currentRegion = REGIONS[region];

  const formatLatency = (ms: number | undefined): string | null => {
    if (ms === undefined) return null;
    if (ms === Infinity) return "超时";
    return `${ms} ms`;
  };

  const isFastest = (r: Region): boolean => {
    const ms = latencies[r];
    if (ms === undefined || ms === Infinity) return false;
    return (Object.entries(latencies) as [Region, number][]).every(
      ([k, v]) => k === r || v === undefined || ms <= v,
    );
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">
            {t("firstRun.title", { defaultValue: "欢迎使用 启航 AI 编程助手" })}
          </DialogTitle>
          <DialogDescription>
            {t("firstRun.description", {
              defaultValue: "请选择线路并输入 API Key 以开始使用。",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* 线路选择 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {t("firstRun.selectRegion", { defaultValue: "选择线路" })}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleAutoDetect}
                disabled={detecting}
              >
                {detecting ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3 mr-1.5" />
                )}
                {detecting
                  ? t("firstRun.detecting", { defaultValue: "检测中…" })
                  : t("firstRun.autoDetect", { defaultValue: "自动检测" })}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["cn", "hk"] as Region[]).map((r) => {
                const info = REGIONS[r];
                const latencyMs = latencies[r];
                const isSelected = region === r;
                const fast = isFastest(r);

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(r)}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40",
                        )}
                      />
                      <span className="text-sm font-medium">{info.label}</span>
                      {fast && (
                        <span className="ml-auto rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                          {t("firstRun.fastest", { defaultValue: "最快" })}
                        </span>
                      )}
                    </div>
                    <span className="pl-5 text-xs text-muted-foreground">
                      {info.apiBase.replace("https://", "")}
                    </span>
                    {latencyMs !== undefined && (
                      <span
                        className={cn(
                          "pl-5 text-xs font-mono",
                          latencyMs === Infinity
                            ? "text-red-500"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatLatency(latencyMs)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key 输入 */}
          <div className="space-y-2">
            <ApiKeyInput
              id="first-run-apikey"
              label="API Key"
              value={apiKey}
              onChange={setApiKey}
              required
            />
            <button
              type="button"
              onClick={() => handleOpenUrl(currentRegion.apiKeyUrl)}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {t("firstRun.getApiKey", {
                defaultValue: "获取 API Key",
              })}
            </button>
          </div>

          {/* 错误信息 */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* 提交按钮 */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={saving || !apiKey.trim()}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {saving
              ? t("common.saving", { defaultValue: "保存中…" })
              : t("firstRun.start", { defaultValue: "开始使用" })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
