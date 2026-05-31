/**
 * Color Conversion Utilities
 * Conversión entre formatos de color (Hex, HSV)
 */

import { HSV } from "@/types/theme";

/**
 * Convierte un color Hex a HSV
 */
export function hexToHsv(hex: string): HSV {
  let r = 0,
    g = 0,
    b = 0;

  if (hex && hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }

  return {
    h,
    s: max === 0 ? 0 : (d / max) * 100,
    v: max * 100,
  };
}

/**
 * Convierte HSV a Hex
 */
export function hsvToHex({ h, s, v }: HSV): string {
  s /= 100;
  v /= 100;

  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };

  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}
