import { entriesInRange, eventsInRange, inRange, localDay, totalsWindow } from './sharedView';

const oct = { from: '2026-10-01', to: '2026-10-31' };

describe('picking history for a range', () => {
  it('keeps entries dated inside the range, both ends included', () => {
    const entries = [
      { id: 'a', entryDate: '2026-09-30' },
      { id: 'b', entryDate: '2026-10-01' },
      { id: 'c', entryDate: '2026-10-31' },
      { id: 'd', entryDate: '2026-11-01' },
    ];
    expect(entriesInRange(entries, oct).map((e) => e.id)).toEqual(['b', 'c']);
    expect(inRange('2026-10-15', oct)).toBe(true);
    expect(inRange('2026-11-01', oct)).toBe(false);
  });

  it('places an event on the day it happened in the viewer calendar', () => {
    // Midday UTC is the same calendar day in every time zone from UTC-11 to UTC+11.
    expect(localDay('2026-10-05T12:00:00+00:00')).toBe('2026-10-05');
    const events = [
      { id: 1, occurredAt: '2026-09-20T12:00:00+00:00' },
      { id: 2, occurredAt: '2026-10-10T12:00:00+00:00' },
    ];
    expect(eventsInRange(events, oct).map((e) => e.id)).toEqual([2]);
  });

  it('falls back to the date part for an unreadable timestamp', () => {
    expect(localDay('2026-10-05 not a time')).toBe('2026-10-05');
  });
});

describe('the window the totals are asked for', () => {
  it('ends at the end of a past range', () => {
    expect(totalsWindow({ from: '2026-09-01', to: '2026-09-30' }, '2026-10-15')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
      future: false,
    });
  });

  it('never goes past today for a range that is still running', () => {
    expect(totalsWindow(oct, '2026-10-15')).toEqual({
      from: '2026-10-01',
      to: '2026-10-15',
      future: false,
    });
  });

  it('flags a range that is entirely in the future', () => {
    expect(totalsWindow({ from: '2026-12-01', to: '2026-12-31' }, '2026-10-15')).toEqual({
      from: '2026-10-15',
      to: '2026-10-15',
      future: true,
    });
  });
});
