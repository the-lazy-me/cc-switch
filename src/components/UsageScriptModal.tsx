import React, { useState } from "react";
import { Play, Save } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Provider, UsageScript, UsageData } from "@/types";
import { usageApi, settingsApi, type AppId } from "@/lib/api";
import { useSettingsQuery } from "@/lib/query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FullScreenPanel } from "@/components/common/FullScreenPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface UsageScriptModalProps {
  provider: Provider;
  appId: AppId;
  isOpen: boolean;
  onClose: () => void;
  onSave: (script: UsageScript) => void;
}

const FIXED_TEMPLATE_TYPE = "newapi" as const;

// 生成固定 newapi 模板 - 使用 /v1/dashboard/billing/subscription 接口
const generateNewApiTemplate = (): string => `({
  request: {
    url: "{{baseUrl}}/v1/dashboard/billing/subscription",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer {{apiKey}}"
    },
  },
  extractor: function (response) {
    if (typeof response?.balance === "number") {
      return {
        planName: "余额",
        remaining: response.balance,
        unit: "CNY",
      };
    }
    return {
      isValid: false,
      invalidMessage: response.message || "查询失败"
    };
  },
})`;

const UsageScriptModal: React.FC<UsageScriptModalProps> = ({
  provider,
  appId,
  isOpen,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: settingsData } = useSettingsQuery();
  const [showUsageConfirm, setShowUsageConfirm] = useState(false);

  const [script, setScript] = useState<UsageScript>(() => {
    const savedScript = provider.meta?.usage_script;
    const defaultScript = {
      enabled: true,
      language: "javascript" as const,
      code: generateNewApiTemplate(),
      timeout: 10,
      autoQueryInterval: 10,
    };

    if (!savedScript) {
      return defaultScript;
    }

    // 迁移旧脚本：更新代码模板为新接口
    return {
      ...savedScript,
      code: generateNewApiTemplate(),
    };
  });

  const [testing, setTesting] = useState(false);

  // 🔧 失焦时的验证（严格）- 自动查询间隔
  const validateAndClampInterval = (value: string): number => {
    const num = Number(value);
    if (isNaN(num) || value.trim() === "") {
      return 10;
    }
    if (!Number.isInteger(num)) {
      toast.warning(
        t("usageScript.intervalMustBeInteger") || "自动查询间隔必须为整数",
      );
    }
    if (num < 0) {
      toast.error(
        t("usageScript.intervalCannotBeNegative") || "自动查询间隔不能为负数",
      );
      return 10;
    }
    const clamped = Math.max(0, Math.min(1440, Math.floor(num)));
    if (clamped !== num && num > 0) {
      toast.info(
        t("usageScript.intervalAdjusted", { value: clamped }) ||
        `自动查询间隔已调整为 ${clamped} 分钟`,
      );
    }
    return clamped;
  };

  const handleEnableToggle = (checked: boolean) => {
    if (checked && !settingsData?.usageConfirmed) {
      setShowUsageConfirm(true);
    } else {
      setScript({ ...script, enabled: checked });
    }
  };

  const handleUsageConfirm = async () => {
    setShowUsageConfirm(false);
    try {
      if (settingsData) {
        await settingsApi.save({ ...settingsData, usageConfirmed: true });
        await queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    } catch (error) {
      console.error("Failed to save usage confirmed:", error);
    }
    setScript({ ...script, enabled: true });
  };

  const handleSave = () => {
    const scriptWithTemplate = {
      ...script,
      code: generateNewApiTemplate(),
      templateType: FIXED_TEMPLATE_TYPE,
      // 将官网地址作为 baseUrl 保存，供定时自动查询时使用
      baseUrl: provider.websiteUrl || script.baseUrl,
    };
    onSave(scriptWithTemplate);
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await usageApi.testScript(
        provider.id,
        appId,
        generateNewApiTemplate(),
        10,
        undefined,
        provider.websiteUrl,
        undefined,
        undefined,
        FIXED_TEMPLATE_TYPE,
      );
      if (result.success && result.data && result.data.length > 0) {
        const summary = result.data
          .map((plan: UsageData) => {
            const planInfo = plan.planName ? `[${plan.planName}]` : "";
            return `${planInfo} ${t("usage.remaining")} ${plan.remaining} ${plan.unit}`;
          })
          .join(", ");
        toast.success(`${t("usageScript.testSuccess")}${summary}`, {
          duration: 3000,
          closeButton: true,
        });

        // 🔧 测试成功后，更新主界面列表的用量查询缓存
        queryClient.setQueryData(["usage", provider.id, appId], result);
      } else {
        toast.error(
          `${t("usageScript.testFailed")}: ${result.error || t("endpointTest.noResult")}`,
          {
            duration: 5000,
          },
        );
      }
    } catch (error: any) {
      toast.error(
        `${t("usageScript.testFailed")}: ${error?.message || t("common.unknown")}`,
        {
          duration: 5000,
        },
      );
    } finally {
      setTesting(false);
    }
  };

  const footer = (
    <>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleTest}
          disabled={!script.enabled || testing}
        >
          <Play size={14} className="mr-1" />
          {testing ? t("usageScript.testing") : t("usageScript.queryNow")}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="border-border/20 hover:bg-accent hover:text-accent-foreground"
        >
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleSave}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Save size={16} className="mr-2" />
          {t("usageScript.saveConfig")}
        </Button>
      </div>
    </>
  );

  return (
    <FullScreenPanel
      isOpen={isOpen}
      title={`${t("usageScript.title")} - ${provider.name}`}
      onClose={onClose}
      footer={footer}
    >
      <div className="glass rounded-xl border border-white/10 px-6 py-4 flex items-center justify-between gap-4">
        <p className="text-base font-medium leading-none text-foreground">
          {t("usageScript.enableUsageQuery")}
        </p>
        <Switch
          checked={script.enabled}
          onCheckedChange={handleEnableToggle}
          aria-label={t("usageScript.enableUsageQuery")}
        />
      </div>

      {script.enabled && (
        <div className="space-y-6">
          <div className="space-y-4 glass rounded-xl border border-white/10 p-6">
            {/* 自动查询间隔 */}
            <div className="space-y-2">
              <Label htmlFor="usage-interval">
                {t("usageScript.autoIntervalMinutes")}
              </Label>
              <Input
                id="usage-interval"
                type="number"
                min={0}
                max={1440}
                value={
                  script.autoQueryInterval ?? script.autoIntervalMinutes ?? 10
                }
                onChange={(e) =>
                  setScript({
                    ...script,
                    autoQueryInterval: validateAndClampInterval(
                      e.target.value,
                    ),
                  })
                }
                onBlur={(e) =>
                  setScript({
                    ...script,
                    autoQueryInterval: validateAndClampInterval(
                      e.target.value,
                    ),
                  })
                }
                className="border-white/10 max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                {t("usageScript.autoQueryIntervalHint")}
              </p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showUsageConfirm}
        variant="info"
        title={t("confirm.usage.title")}
        message={t("confirm.usage.message")}
        confirmText={t("confirm.usage.confirm")}
        onConfirm={() => void handleUsageConfirm()}
        onCancel={() => setShowUsageConfirm(false)}
      />
    </FullScreenPanel>
  );
};

export default UsageScriptModal;
