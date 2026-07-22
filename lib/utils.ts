import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPkr(value: number): string {
  const amount = Number.isFinite(value) ? Math.round(value) : 0;
  return `Rs. ${amount.toLocaleString('en-PK')}`;
}
