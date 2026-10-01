/** Money is always an integer number of fils (1 AED = 100 fils). Never use floats for money. */
export type Fils = number;

const FILS_PER_AED = 100;

export function aedToFils(aed: number): Fils {
  return Math.round(aed * FILS_PER_AED);
}

/** Format fils as `AED 1,234.50`; negatives render as `-AED 1,234.50`. */
export function formatAed(fils: Fils): string {
  const sign = fils < 0 ? '-' : '';
  const abs = Math.abs(fils);
  const whole = Math.floor(abs / FILS_PER_AED);
  const cents = String(abs % FILS_PER_AED).padStart(2, '0');
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}AED ${grouped}.${cents}`;
}

export type ParseResult = { ok: true; fils: Fils } | { ok: false; reason: 'empty' | 'invalid' };

/** Parse user input such as "8,200", "8200.5" or "AED 8200.50" into fils. Rejects negatives and junk. */
export function parseAmountToFils(input: string): ParseResult {
  const cleaned = input.replace(/AED/gi, '').replace(/[,\s]/g, '');
  if (cleaned === '') return { ok: false, reason: 'empty' };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { ok: false, reason: 'invalid' };
  return { ok: true, fils: Math.round(Number(cleaned) * FILS_PER_AED) };
}
