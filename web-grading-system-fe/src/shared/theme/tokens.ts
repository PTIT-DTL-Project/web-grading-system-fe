/**
 * Single source of truth for the app palette (school theme: red + white).
 * Components must read colors from here — never hardcode a hex/rgb in TSX or CSS.
 * Changing the school red = changing `primary` (and its derived shades) on this file only.
 * Status colors follow standard semantic conventions: green for active, gray for archived.
 */
export const colors = {
  /** School red — primary actions, active nav, brand bar. */
  primary: '#C8102E',
  /** Hover/pressed shade of the primary red. */
  primaryHover: '#A00C24',
  /** Tinted red for selected rows, subtle highlights. */
  primaryLight: '#FFF5F5',
  /** Page background behind cards. */
  layoutBg: '#F5F6F8',
  /** Card/surface background. */
  surface: '#FFFFFF',
  /** Text/icons drawn on top of the primary red. */
  textOnPrimary: '#FFFFFF',
  /** Default divider/border on light surfaces. */
  border: '#F0F0F0',
  /** Status color for ACTIVE classes — green (success/positive). */
  statusActive: '#23C181',
  /** Status color for ARCHIVED classes — neutral gray (inactive). */
  statusArchived: '#BFBFBF',
  /** Success green for positive actions. */
  success: '#23C181',
  /** Warning yellow for caution states. */
  warning: '#F59E0B',
  /** Danger red for errors and cancellations. */
  error: '#EF4444',
  /** Info blue for informational states. */
  info: '#3B82F6',
  /** Neutral gray for disabled/inactive states. */
  neutral: '#6B7280',
} as const
