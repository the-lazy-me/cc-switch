import { describe, expect, it } from "vitest";
import { providerPresets } from "@/config/claudeProviderPresets";

describe("启航 AI Provider Presets", () => {
  const qhaiPreset = providerPresets.find((p) => p.name === "启航 AI");

  it("should include 启航 AI preset", () => {
    expect(qhaiPreset).toBeDefined();
  });

  it("preset should have ANTHROPIC_BASE_URL pointing to qhaigc.net", () => {
    const env = (qhaiPreset!.settingsConfig as any).env;
    expect(env.ANTHROPIC_BASE_URL).toContain("qhaigc.net");
  });

  it("preset should have no ANTHROPIC_AUTH_TOKEN (system-level token, no API key needed)", () => {
    const env = (qhaiPreset!.settingsConfig as any).env;
    expect(env).not.toHaveProperty("ANTHROPIC_AUTH_TOKEN");
  });

  it("preset apiKeyUrl should point to system token profile page", () => {
    expect(qhaiPreset!.apiKeyUrl).toContain("/console/profile");
  });

  it("preset should have default model fields", () => {
    const env = (qhaiPreset!.settingsConfig as any).env;
    expect(env).toHaveProperty("ANTHROPIC_MODEL");
    expect(env).toHaveProperty("ANTHROPIC_DEFAULT_HAIKU_MODEL");
    expect(env).toHaveProperty("ANTHROPIC_DEFAULT_SONNET_MODEL");
    expect(env).toHaveProperty("ANTHROPIC_DEFAULT_OPUS_MODEL");
  });

  it("preset should have third_party category", () => {
    expect(qhaiPreset!.category).toBe("third_party");
  });

  it("preset should have endpointCandidates with domestic and HK endpoints", () => {
    expect(qhaiPreset!.endpointCandidates).toContain("https://api.qhaigc.net");
    expect(qhaiPreset!.endpointCandidates).toContain(
      "https://api-hk.qhaigc.net",
    );
  });

  it("providerPresets should only contain 启航 AI", () => {
    expect(providerPresets).toHaveLength(1);
    expect(providerPresets[0].name).toBe("启航 AI");
  });
});
