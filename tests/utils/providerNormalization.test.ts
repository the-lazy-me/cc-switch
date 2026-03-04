import { describe, expect, it } from "vitest";
import type { Provider } from "@/types";
import { normalizeProvidersForApp } from "@/utils/providerNormalization";

function buildProvider(overrides: Partial<Provider>): Provider {
  return {
    id: "provider-1",
    name: "Provider",
    settingsConfig: {},
    ...overrides,
  };
}

describe("normalizeProvidersForApp", () => {
  it("normalizes 启航 AI metadata and OpenCode model config", () => {
    const providers: Record<string, Provider> = {
      qihanai: buildProvider({
        id: "qihanai",
        name: "qihanai",
        settingsConfig: {
          npm: "@ai-sdk/openai-compatible",
          options: {
            baseURL: "https://api.qhaigc.net/v1",
          },
          models: {
            "gpt-5.3-codex": { name: "Old Name", limit: { context: 1 } },
          },
        },
      }),
    };

    const normalized = normalizeProvidersForApp(providers, "opencode");
    const qhai = normalized.qihanai;

    expect(qhai.name).toBe("启航 AI");
    expect(qhai.icon).toBe("qihanai");
    expect(qhai.websiteUrl).toBe("https://www.qhaigc.net");
    expect(qhai.category).toBe("third_party");
    expect(qhai.settingsConfig.npm).toBe("@ai-sdk/openai-compatible");
    expect(qhai.settingsConfig.models["gpt-5.3-codex"].name).toBe("GPT-5.3 Codex");
    expect(qhai.settingsConfig.models["gpt-5.3-codex"].limit).toEqual({ context: 1 });
    expect(qhai.settingsConfig.models["claude-sonnet-4-5-20250929"]).toEqual({
      name: "Claude Sonnet 4.5",
    });
    expect(qhai.settingsConfig.models["claude-opus-4-5-20251101"]).toEqual({
      name: "Claude Opus 4.5",
    });
    expect(qhai.settingsConfig.models["gemini-3-pro-preview"]).toEqual({
      name: "Gemini 3 Pro Preview",
    });
  });

  it("uses HK website for HK baseURL", () => {
    const providers: Record<string, Provider> = {
      qihanai: buildProvider({
        id: "qihanai",
        name: "qihanai",
        settingsConfig: {
          options: {
            baseURL: "https://api-hk.qhaigc.net/v1",
          },
          models: {},
        },
      }),
    };

    const normalized = normalizeProvidersForApp(providers, "opencode");
    expect(normalized.qihanai.websiteUrl).toBe("https://www-hk.qhaigc.net");
  });

  it("keeps non-opencode apps unchanged", () => {
    const providers: Record<string, Provider> = {
      qihanai: buildProvider({
        id: "qihanai",
        name: "qihanai",
        settingsConfig: {
          options: { baseURL: "https://api.qhaigc.net/v1" },
        },
      }),
    };

    const normalized = normalizeProvidersForApp(providers, "claude");
    expect(normalized).toBe(providers);
  });

  it("keeps unrelated OpenCode providers unchanged", () => {
    const providers: Record<string, Provider> = {
      other: buildProvider({
        id: "other",
        name: "Other Provider",
        settingsConfig: {
          options: { baseURL: "https://api.example.com/v1" },
          models: { "gpt-4o": { name: "GPT-4o" } },
        },
      }),
    };

    const normalized = normalizeProvidersForApp(providers, "opencode");
    expect(normalized.other).toEqual(providers.other);
  });
});
