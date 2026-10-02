import { aedToFils, formatAed, formatAedShort, parseAmountToFils } from './money';

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

describe('amount limits and compact labels', () => {
  it('rejects amounts above one billion AED so fils stay safe integers', () => {
    expect(parseAmountToFils('99999999999999999999')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmountToFils('1000000000.01')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmountToFils('1000000000')).toEqual({ ok: true, fils: 100_000_000_000 });
  });

  it('accepted amounts are always safe integers', () => {
    const r = parseAmountToFils('1000000000');
    expect(r.ok && Number.isSafeInteger(r.fils)).toBe(true);
  });

  it.each([
    [99960, 'AED 1k'], // 999.60 must not render as "AED 1000"
    [99940, 'AED 999'],
    [100000, 'AED 1k'],
  ])('formatAedShort(%p) is %p', (fils, expected) => {
    expect(formatAedShort(fils)).toBe(expected);
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
