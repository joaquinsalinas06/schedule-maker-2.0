/**
 * Schedule block color palette — distinguishable, accessible tones
 * for both light and dark canvas backgrounds.
 *
 * Each entry provides:
 *   bg     – fill color for the course block (canvas fillStyle)
 *   border – border color for the block
 *   text   – text color on top of the block
 *   name   – human-readable label for debugging / legends
 */

export const SCHEDULE_COLORS_LIGHT = [
  { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', name: 'emerald' },
  { bg: '#f5f5f4', border: '#a8a29e', text: '#292524', name: 'stone' },
  { bg: '#f4f4f5', border: '#a1a1aa', text: '#27272a', name: 'zinc' },
  { bg: '#f5f5f5', border: '#a3a3a3', text: '#262626', name: 'neutral' },
  { bg: '#f0fdf4', border: '#86efac', text: '#14532d', name: 'green' },
  { bg: '#fafaf9', border: '#78716c', text: '#44403c', name: 'warm' },
  { bg: '#f1f5f9', border: '#94a3b8', text: '#334155', name: 'cool' },
  { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', name: 'conflict' },
] as const

export const SCHEDULE_COLORS_DARK = [
  { bg: 'rgba(16, 185, 129, 0.25)', border: '#059669', text: '#a7f3d0', name: 'emerald' },
  { bg: 'rgba(168, 162, 158, 0.20)', border: '#78716c', text: '#e7e5e4', name: 'stone' },
  { bg: 'rgba(161, 161, 170, 0.20)', border: '#71717a', text: '#e4e4e7', name: 'zinc' },
  { bg: 'rgba(163, 163, 163, 0.20)', border: '#737373', text: '#e5e5e5', name: 'neutral' },
  { bg: 'rgba(34, 197, 94, 0.20)',   border: '#16a34a', text: '#bbf7d0', name: 'green' },
  { bg: 'rgba(120, 113, 108, 0.25)', border: '#57534e', text: '#fafaf9', name: 'warm' },
  { bg: 'rgba(148, 163, 184, 0.20)', border: '#64748b', text: '#e2e8f0', name: 'cool' },
  { bg: 'rgba(220, 38, 38, 0.20)',   border: '#dc2626', text: '#fecaca', name: 'conflict' },
] as const

/** Get color palette based on dark/light mode */
export function getScheduleColors(isDark: boolean) {
  return isDark ? SCHEDULE_COLORS_DARK : SCHEDULE_COLORS_LIGHT
}

/** Legacy export for backward compat (dark mode default since canvas uses dark bg) */
export const SCHEDULE_COLORS = SCHEDULE_COLORS_DARK

export type ScheduleColor = (typeof SCHEDULE_COLORS_DARK)[number]
