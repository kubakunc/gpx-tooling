export type ToolKey = 'merge' | 'trim' | 'convert' | 'elevation' | 'reduce' | 'compare';

export interface ToolTheme {
  /** Hub tile background */
  tile: string;
  /** Icon chip background */
  icon: string;
  /** Title text color */
  title: string;
  /** Subtitle text color */
  subtitle: string;
  /** Primary button background */
  button: string;
}

export const toolThemes: Record<ToolKey, ToolTheme> = {
  merge: { tile: '#ecfdf5', icon: '#10b981', title: '#064e3b', subtitle: '#5b8c7d', button: '#059669' },
  trim: { tile: '#eff6ff', icon: '#3b82f6', title: '#1e3a8a', subtitle: '#6b8fc7', button: '#1d4ed8' },
  convert: { tile: '#fdf2f8', icon: '#ec4899', title: '#831843', subtitle: '#b06a8c', button: '#be185d' },
  elevation: { tile: '#fef3c7', icon: '#f59e0b', title: '#92400e', subtitle: '#b45309', button: '#b45309' },
  reduce: { tile: '#f3e8ff', icon: '#8b5cf6', title: '#4c1d95', subtitle: '#8a6fc0', button: '#6d28d9' },
  compare: { tile: '#eef2ff', icon: '#6366f1', title: '#3730a3', subtitle: '#7c83c4', button: '#4f46e5' }
};

/**
 * Build an `rgba(r, g, b, a)` string from a `#rrggbb` hex color.
 * Used to derive button drop-shadows from a tool's accent so the shadow
 * tracks the same source color as the button background.
 */
export function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface RelatedAppTheme {
  tile: string;
  border: string;
  icon: string;
  title: string;
  subtitle: string;
}

export const relatedApp: RelatedAppTheme = {
  tile: '#ecfeff',
  border: '#cdf0f5',
  icon: '#06b6d4',
  title: '#155e75',
  subtitle: '#5b9aa8'
};
