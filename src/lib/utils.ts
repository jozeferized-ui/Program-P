/**
 * @file utils.ts
 * @description Funkcje pomocnicze dla całej aplikacji
 * 
 * @module lib/utils
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Łączy klasy CSS z obsługą TailwindCSS
 * Używa clsx do warunkowego łączenia i tailwind-merge do rozwiązywania konfliktów
 * 
 * @param inputs - Tablica klas CSS (stringi, obiekty, tablice)
 * @returns Połączony string klas bez konfliktów Tailwind
 * @example
 * cn("px-2 py-1", "px-4") → "py-1 px-4" (usuwa konflikt px)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatuje numer telefonu do polskiego formatu: XXX XXX XXX
 * Usuwa wszystkie znaki nie będące cyframi
 * 
 * @param value - Numer telefonu (dowolny format)
 * @returns Sformatowany numer lub pusty string
 * @example
 * formatPhoneNumber("123456789") → "123 456 789"
 */
export function formatPhoneNumber(value: string) {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3)}`;
  }
  return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 6)} ${phoneNumber.slice(6, 9)}`;
}
