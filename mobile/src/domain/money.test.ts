import { aedToFils, formatAed, parseAmountToFils } from './money';

describe('formatAed', () => {
  it.each([
    [0, 'AED 0.00'],
    [5, 'AED 0.05'],
    [100, 'AED 1.00'],
    [123450, 'AED 1,234.50'],
    [820000, 'AED 8,200.00'],
    [123456789, 'AED 1,234,567.89'],
    [-125000, '-AED 1,250.00'],
  ])('formats %p fils as %p', (fils, expected) => {
    expect(formatAed(fils)).toBe(expected);
  });
});

describe('aedToFils', () => {
  it('converts whole and fractional AED without float drift', () => {
    expect(aedToFils(3500)).toBe(350000);
    expect(aedToFils(0.1 + 0.2)).toBe(30);
  });
});

describe('parseAmountToFils', () => {
  it.each([
    ['8200', 820000],
    ['8,200', 820000],
    ['8200.5', 820050],
    ['AED 8200.50', 820050],
    [' 0 ', 0],
  ])('parses %p', (input, fils) => {
    expect(parseAmountToFils(input)).toEqual({ ok: true, fils });
  });

  it('reports empty input', () => {
    expect(parseAmountToFils('  ')).toEqual({ ok: false, reason: 'empty' });
  });

  it.each(['-5', 'abc', '1.234', '1e3', '12..5', 'NaN', 'Infinity'])('rejects %p', (input) => {
    expect(parseAmountToFils(input)).toEqual({ ok: false, reason: 'invalid' });
  });
});
