import { describe, it, expect } from "vitest";
import { COLOR_PRESETS, getDefaultTheme, findThemeByName } from "../colorSystem";

describe("COLOR_PRESETS", () => {
  it("contains exactly 5 presets", () => {
    expect(COLOR_PRESETS).toHaveLength(5);
  });

  it("each preset has all required theme fields", () => {
    for (const preset of COLOR_PRESETS) {
      expect(preset).toHaveProperty("name");
      expect(preset).toHaveProperty("bg");
      expect(preset).toHaveProperty("surface");
      expect(preset).toHaveProperty("accent");
      expect(preset).toHaveProperty("text");
      expect(preset).toHaveProperty("sub");
    }
  });

  it("each preset has valid hex colors", () => {
    const hexRegex = /^#[0-9a-f]{6}$/;
    for (const preset of COLOR_PRESETS) {
      expect(preset.bg).toMatch(hexRegex);
      expect(preset.surface).toMatch(hexRegex);
      expect(preset.accent).toMatch(hexRegex);
      expect(preset.text).toMatch(hexRegex);
      expect(preset.sub).toMatch(hexRegex);
    }
  });

  it("each preset has a unique name", () => {
    const names = COLOR_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("getDefaultTheme", () => {
  it("returns the first preset (Oscuro Puro)", () => {
    const theme = getDefaultTheme();
    expect(theme.name).toBe("Oscuro Puro");
    expect(theme).toEqual(COLOR_PRESETS[0]);
  });
});

describe("findThemeByName", () => {
  it("finds an existing theme by name", () => {
    const theme = findThemeByName("Azul Eléctrico");
    expect(theme).toBeDefined();
    expect(theme!.name).toBe("Azul Eléctrico");
    expect(theme!.accent).toBe("#00d9ff");
  });

  it("returns undefined for non-existent theme", () => {
    const theme = findThemeByName("Nonexistent Theme");
    expect(theme).toBeUndefined();
  });

  it("is case-sensitive", () => {
    const theme = findThemeByName("oscuro puro");
    expect(theme).toBeUndefined();
  });

  it("finds all presets by their exact names", () => {
    for (const preset of COLOR_PRESETS) {
      const found = findThemeByName(preset.name);
      expect(found).toEqual(preset);
    }
  });
});
