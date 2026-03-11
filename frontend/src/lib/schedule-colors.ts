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
  { bg: 'rgba(59, 130, 246, 0.25)', border: '#1d4ed8', text: '#bfdbfe', name: 'blue' },
  { bg: 'rgba(16, 185, 129, 0.25)', border: '#047857', text: '#a7f3d0', name: 'emerald' },
  { bg: 'rgba(245, 158, 11, 0.25)', border: '#b45309', text: '#fde68a', name: 'amber' },
  { bg: 'rgba(139, 92, 246, 0.25)', border: '#6d28d9', text: '#ddd6fe', name: 'violet' },
  { bg: 'rgba(239, 68, 68, 0.25)', border: '#b91c1c', text: '#fecaca', name: 'red' },
  { bg: 'rgba(6, 182, 212, 0.25)', border: '#0e7490', text: '#a5f3fc', name: 'cyan' },
  { bg: 'rgba(99, 102, 241, 0.25)', border: '#4338ca', text: '#e0e7ff', name: 'indigo' },
  { bg: 'rgba(249, 115, 22, 0.25)', border: '#c2410c', text: '#ffedd5', name: 'orange' },
  { bg: 'rgba(20, 184, 166, 0.25)', border: '#0f766e', text: '#ccfbf1', name: 'teal' },
  { bg: 'rgba(236, 72, 153, 0.25)', border: '#be185d', text: '#fbcfe8', name: 'pink' },
  { bg: 'rgba(34, 197, 94, 0.25)', border: '#15803d', text: '#bbf7d0', name: 'green' },
  { bg: 'rgba(14, 165, 233, 0.25)', border: '#0369a1', text: '#bae6fd', name: 'sky' },
] as const

/** Get color palette based on dark/light mode */
export function getScheduleColors(isDark: boolean) {
  return isDark ? SCHEDULE_COLORS_DARK : SCHEDULE_COLORS_LIGHT
}

/** Legacy export for backward compat (dark mode default since canvas uses dark bg) */
export const SCHEDULE_COLORS = SCHEDULE_COLORS_DARK

export type ScheduleColor = (typeof SCHEDULE_COLORS_DARK)[number]
