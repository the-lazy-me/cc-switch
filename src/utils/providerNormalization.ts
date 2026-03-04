import type { AppId } from "@/lib/api";
import type { OpenCodeModel, Provider } from "@/types";

const QHAI_OPENCODE_DEFAULT_MODELS: Record<string, string> = {
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5",
  "claude-opus-4-5-20251101": "Claude Opus 4.5",
  "gemini-3-pro-preview": "Gemini 3 Pro Preview",
  "gpt-5.3-codex": "GPT-5.3 Codex",
};

const QHAI_OFFICIAL_NAME = "启航 AI";
const QHAI_WEBSITE_CN = "https://www.qhaigc.net";
const QHAI_WEBSITE_HK = "https://www-hk.qhaigc.net";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getOpencodeBaseUrl(provider: Provider): string {
  const settings = asRecord(provider.settingsConfig);
  const options = asRecord(settings?.options);
  const baseUrl = options?.baseURL;
  return typeof baseUrl === "string" ? baseUrl : "";
}

function isQhaiProvider(provider: Provider): boolean {
  const idLower = provider.id.toLowerCase();
  const nameLower = provider.name.toLowerCase();
  const websiteLower = (provider.websiteUrl || "").toLowerCase();
  const baseUrlLower = getOpencodeBaseUrl(provider).toLowerCase();

  return (
    idLower === "qihanai" ||
    idLower.includes("qihan") ||
    nameLower.includes("启航") ||
    nameLower.includes("qihan") ||
    websiteLower.includes("qhaigc.net") ||
    baseUrlLower.includes("qhaigc.net")
  );
}

function normalizeQhaiModels(
  models: Record<string, unknown>,
): Record<string, OpenCodeModel> {
  const nextModels: Record<string, OpenCodeModel> = {};

  for (const [modelId, modelValue] of Object.entries(models)) {
    if (!modelValue || typeof modelValue !== "object" || Array.isArray(modelValue)) {
      continue;
    }
    nextModels[modelId] = modelValue as OpenCodeModel;
  }

  for (const [modelId, modelName] of Object.entries(QHAI_OPENCODE_DEFAULT_MODELS)) {
    const currentModel = nextModels[modelId];
    if (currentModel) {
      nextModels[modelId] = { ...currentModel, name: modelName };
      continue;
    }
    nextModels[modelId] = { name: modelName };
  }

  return nextModels;
}

function normalizeQhaiOpencodeSettings(
  settingsConfig: Provider["settingsConfig"],
): Provider["settingsConfig"] {
  const settings = asRecord(settingsConfig);
  if (!settings) return settingsConfig;

  const options = asRecord(settings.options) || {};
  const models = asRecord(settings.models) || {};

  return {
    ...settings,
    npm: "@ai-sdk/openai-compatible",
    options: {
      ...options,
    },
    models: normalizeQhaiModels(models),
  };
}

function normalizeOpencodeProvider(provider: Provider): Provider {
  if (!isQhaiProvider(provider)) {
    return provider;
  }

  const baseUrl = getOpencodeBaseUrl(provider);
  const websiteUrl = baseUrl.includes("-hk.") ? QHAI_WEBSITE_HK : QHAI_WEBSITE_CN;

  return {
    ...provider,
    name: QHAI_OFFICIAL_NAME,
    websiteUrl,
    category: provider.category || "third_party",
    icon: "qihanai",
    settingsConfig: normalizeQhaiOpencodeSettings(provider.settingsConfig),
  };
}

export function normalizeProvidersForApp(
  providers: Record<string, Provider>,
  appId: AppId,
): Record<string, Provider> {
  if (appId !== "opencode") {
    return providers;
  }

  const normalizedEntries = Object.entries(providers).map(([id, provider]) => [
    id,
    normalizeOpencodeProvider(provider),
  ]);

  return Object.fromEntries(normalizedEntries);
}
