/**
 * OpenClaw provider presets configuration
 * OpenClaw uses models.providers structure with custom provider configs
 */
import type {
  ProviderCategory,
  OpenClawProviderConfig,
  OpenClawDefaultModel,
} from "../types";
import type { PresetTheme, TemplateValueConfig } from "./claudeProviderPresets";

/** Suggested default model configuration for a preset */
export interface OpenClawSuggestedDefaults {
  /** Default model config to apply (agents.defaults.model) */
  model?: OpenClawDefaultModel;
  /** Model catalog entries to add (agents.defaults.models) */
  modelCatalog?: Record<string, { alias?: string }>;
}

export interface OpenClawProviderPreset {
  name: string;
  websiteUrl: string;
  apiKeyUrl?: string;
  /** OpenClaw settings_config structure */
  settingsConfig: OpenClawProviderConfig;
  isOfficial?: boolean;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  category?: ProviderCategory;
  /** Template variable definitions */
  templateValues?: Record<string, TemplateValueConfig>;
  /** Visual theme config */
  theme?: PresetTheme;
  /** Icon name */
  icon?: string;
  /** Icon color */
  iconColor?: string;
  /** Mark as custom template (for UI distinction) */
  isCustomTemplate?: boolean;
  /** Suggested default model configuration */
  suggestedDefaults?: OpenClawSuggestedDefaults;
}

/**
 * OpenClaw API protocol options
 * @see https://github.com/openclaw/openclaw/blob/main/docs/gateway/configuration.md
 */
export const openclawApiProtocols = [
  { value: "openai-completions", label: "OpenAI Completions" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
  { value: "google-generative-ai", label: "Google Generative AI" },
  { value: "bedrock-converse-stream", label: "AWS Bedrock" },
] as const;

/**
 * OpenClaw provider presets list
 */
export const openclawProviderPresets: OpenClawProviderPreset[] = [
  {
    name: "启航 AI",
    websiteUrl: "https://www.qhaigc.net/",
    apiKeyUrl: "https://www.qhaigc.net/console/profile",
    settingsConfig: {
      baseUrl: "https://api.qhaigc.net/v1",
      api: "openai-completions",
      models: [
        {
          id: "claude-sonnet-4-5-20250929",
          name: "Claude Sonnet 4.5",
          contextWindow: 200000,
          cost: { input: 3, output: 15 },
        },
        {
          id: "claude-opus-4-5-20251101",
          name: "Claude Opus 4.5",
          contextWindow: 200000,
          cost: { input: 15, output: 75 },
        },
        {
          id: "gemini-3-pro-preview",
          name: "Gemini 3 Pro Preview",
          contextWindow: 1000000,
          cost: { input: 1.25, output: 5 },
        },
        {
          id: "gpt-5.3-codex",
          name: "GPT-5.3 Codex",
          contextWindow: 400000,
          cost: { input: 3, output: 15 },
        },
      ],
    },
    category: "third_party",
    icon: "qihanai",
    suggestedDefaults: {
      model: {
        primary: "qihanai/claude-sonnet-4-5-20250929",
        fallbacks: ["qihanai/claude-opus-4-5-20251101"],
      },
      modelCatalog: {
        "qihanai/claude-sonnet-4-5-20250929": { alias: "Sonnet" },
        "qihanai/claude-opus-4-5-20251101": { alias: "Opus" },
      },
    },
  },
];
