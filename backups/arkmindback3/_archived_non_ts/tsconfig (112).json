import { describe, it, expect } from "vitest";
import { hexToHsv, hsvToHex } from "../colorConversion";

describe("hexToHsv", () => {
  it("converts pure red (#ff0000) correctly", () => {
    const result = hexToHsv("#ff0000");
    expect(result.h).toBeCloseTo(0, 0);
    expect(result.s).toBeCloseTo(100, 0);
    expect(result.v).toBeCloseTo(100, 0);
  });

  it("converts pure green (#00ff00) correctly", () => {
    const result = hexToHsv("#00ff00");
    expect(result.h).toBeCloseTo(120, 0);
    expect(result.s).toBeCloseTo(100, 0);
    expect(result.v).toBeCloseTo(100, 0);
  });

  it("converts pure blue (#0000ff) correctly", () => {
    const result = hexToHsv("#0000ff");
    expect(result.h).toBeCloseTo(240, 0);
    expect(result.s).toBeCloseTo(100, 0);
    expect(result.v).toBeCloseTo(100, 0);
  });

  it("converts white (#ffffff) correctly", () => {
    const result = hexToHsv("#ffffff");
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.v).toBeCloseTo(100, 0);
  });

  it("converts black (#000000) correctly", () => {
    const result = hexToHsv("#000000");
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.v).toBe(0);
  });

  it("converts yellow (#ffff00) correctly", () => {
    const result = hexToHsv("#ffff00");
    expect(result.h).toBeCloseTo(60, 0);
    expect(result.s).toBeCloseTo(100, 0);
    expect(result.v).toBeCloseTo(100, 0);
  });

  it("converts cyan (#00ffff) correctly", () => {
    const result = hexToHsv("#00ffff");
    expect(result.h).toBeCloseTo(180, 0);
    expect(result.s).toBeCloseTo(100, 0);
    expect(result.v).toBeCloseTo(100, 0);
  });

  it("handles mid-gray (#808080) correctly", () => {
    const result = hexToHsv("#808080");
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.v).toBeCloseTo(50.2, 0);
  });

  it("handles invalid/empty input gracefully", () => {
    const result = hexToHsv("");
    expect(result).toEqual({ h: 0, s: 0, v: 0 });
  });

  it("handles short hex strings gracefully", () => {
    const result = hexToHsv("#fff");
    expect(result).toEqual({ h: 0, s: 0, v: 0 });
  });
});

describe("hsvToHex", () => {
  it("converts pure red (h=0, s=100, v=100) correctly", () => {
    expect(hsvToHex({ h: 0, s: 100, v: 100 })).toBe("#ff0000");
  });

  it("converts pure green (h=120, s=100, v=100) correctly", () => {
    expect(hsvToHex({ h: 120, s: 100, v: 100 })).toBe("#00ff00");
  });

  it("converts pure blue (h=240, s=100, v=100) correctly", () => {
    expect(hsvToHex({ h: 240, s: 100, v: 100 })).toBe("#0000ff");
  });

  it("converts white (h=0, s=0, v=100) correctly", () => {
    expect(hsvToHex({ h: 0, s: 0, v: 100 })).toBe("#ffffff");
  });

  it("converts black (h=0, s=0, v=0) correctly", () => {
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe("#000000");
  });

  it("converts yellow (h=60, s=100, v=100) correctly", () => {
    expect(hsvToHex({ h: 60, s: 100, v: 100 })).toBe("#ffff00");
  });

  it("converts cyan (h=180, s=100, v=100) correctly", () => {
    expect(hsvToHex({ h: 180, s: 100, v: 100 })).toBe("#00ffff");
  });
});

describe("hexToHsv → hsvToHex round-trip", () => {
  const colors = [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffffff",
    "#000000",
    "#ff8800",
    "#8844cc",
    "#1a3a52",
  ];

  for (const hex of colors) {
    it(`round-trips ${hex} correctly`, () => {
      const hsv = hexToHsv(hex);
      const result = hsvToHex(hsv);
      expect(result).toBe(hex);
    });
  }
});
