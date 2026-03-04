import { describe, expect, it } from "vitest";
import {
  opencodeProviderPresets,
  opencodeNpmPackages,
  OPENCODE_PRESET_MODEL_VARIANTS,
} from "@/config/opencodeProviderPresets";

describe("OpenCode Provider Presets", () => {
  it("should include @ai-sdk/amazon-bedrock in npm packages list", () => {
    const bedrockPkg = opencodeNpmPackages.find(
      (p) => p.value === "@ai-sdk/amazon-bedrock",
    );
    expect(bedrockPkg).toBeDefined();
    expect(bedrockPkg!.label).toBe("Amazon Bedrock");
  });

  it("should include Bedrock model variants in OPENCODE_PRESET_MODEL_VARIANTS", () => {
    const variants = OPENCODE_PRESET_MODEL_VARIANTS["@ai-sdk/amazon-bedrock"];
    expect(variants).toBeDefined();
    expect(variants.length).toBeGreaterThan(0);

    const opusModel = variants.find((v) =>
      v.id.includes("anthropic.claude-opus-4-6"),
    );
    expect(opusModel).toBeDefined();
  });

  describe("启航 AI OpenCode preset", () => {
    const qhaiPreset = opencodeProviderPresets.find(
      (p) => p.name === "启航 AI",
    );

    it("should include 启航 AI preset", () => {
      expect(qhaiPreset).toBeDefined();
    });

    it("preset should have third_party category", () => {
      expect(qhaiPreset!.category).toBe("third_party");
    });

    it("preset should have models with Claude entries", () => {
      const models = qhaiPreset!.settingsConfig.models;
      expect(models).toBeDefined();
      const modelIds = Object.keys(models!);
      expect(modelIds.some((id) => id.includes("claude"))).toBe(true);
    });

    it("opencodeProviderPresets should only contain 启航 AI", () => {
      expect(opencodeProviderPresets).toHaveLength(1);
      expect(opencodeProviderPresets[0].name).toBe("启航 AI");
    });
  });
});
