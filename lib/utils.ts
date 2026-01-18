/**
 * Utility functions for MyLedger application
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a numeric string or number for display with Indonesian locale formatting
 * @param val - String or number to format
 * @returns Formatted string with thousand separators (e.g., "1.000.000")
 */
export function formatDisplayAmount(val: string | number): string {
  if (!val && val !== 0) return "";
  const num = val.toString().replace(/\D/g, "");
  return new Intl.NumberFormat('id-ID').format(Number(num));
}

/**
 * Format currency for display (with Rp prefix)
 * @param amount - Number to format as currency
 * @param showPrefix - Whether to show "Rp" prefix (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, showPrefix: boolean = true): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(amount);
  return showPrefix ? `Rp ${formatted}` : formatted;
}

/**
 * Parse formatted amount string to number
 * @param val - Formatted string (e.g., "1.000.000")
 * @returns Parsed number
 */
export function parseAmount(val: string): number {
  if (!val) return 0;
  return Number(val.replace(/\D/g, ""));
}
