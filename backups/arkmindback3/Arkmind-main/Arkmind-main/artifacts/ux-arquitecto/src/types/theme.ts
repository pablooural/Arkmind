/**
 * Theme Type Definitions
 * Define la estructura de tema y colores del sistema
 */

export interface ThemeColors {
  bg: string;        // Color de fondo
  surface: string;   // Color de superficie/panel
  accent: string;    // Color de acento
  text: string;      // Color de texto
  sub: string;       // Color de texto secundario
}

export interface Theme extends ThemeColors {
  name: string;
}

export interface HSV {
  h: number; // Hue (0-360)
  s: number; // Saturation (0-100)
  v: number; // Value/Brightness (0-100)
}

export interface ColorPickerState {
  target: keyof ThemeColors | null;
  tempColor: string;
}

export interface LayoutMode {
  type: "slide" | "split-v" | "split-h";
}
