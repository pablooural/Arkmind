/**
 * Color System
 * 5 paletas predefinidas con colores para fondo y panel
 */

import { Theme } from "@/types/theme";

export const COLOR_PRESETS: Theme[] = [
  {
    name: "Oscuro Puro",
    bg: "#0a0a0a",
    surface: "#1a1a1a",
    accent: "#ffff00",
    text: "#ffffff",
    sub: "#cccccc",
  },
  {
    name: "Azul Eléctrico",
    bg: "#0d1b2a",
    surface: "#1b3a52",
    accent: "#00d9ff",
    text: "#ffffff",
    sub: "#b0b0b0",
  },
  {
    name: "Verde Neón",
    bg: "#0a1f0f",
    surface: "#1a3a1f",
    accent: "#00ff00",
    text: "#ffffff",
    sub: "#b0b0b0",
  },
  {
    name: "Rojo Intenso",
    bg: "#1a0a0a",
    surface: "#3a1515",
    accent: "#ff0040",
    text: "#ffffff",
    sub: "#b0b0b0",
  },
  {
    name: "Púrpura Profundo",
    bg: "#15051f",
    surface: "#2a1540",
    accent: "#ff00ff",
    text: "#ffffff",
    sub: "#b0b0b0",
  },
];

export const getDefaultTheme = (): Theme => COLOR_PRESETS[0];

export const findThemeByName = (name: string): Theme | undefined => {
  return COLOR_PRESETS.find((p) => p.name === name);
};
