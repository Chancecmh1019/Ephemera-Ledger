import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
}

export function safeParseDate(dateStr: string): Date {
  try {
    const d = parseISO(dateStr);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return new Date();
}
