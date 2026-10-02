const { compareVersions, evaluateExceptions } = require('./exception-watch');

const exception = {
  id: 'GHSA-86w9-cpqp-85rv',
  package: 'node-forge',
  fixedAfter: '1.4.0',
  expires: '2026-11-01',
};
const today = new Date('2026-10-02T00:00:00Z');

describe('compareVersions', () => {
  it.each([
    ['1.4.0', '1.4.0', 0],
    ['1.4.1', '1.4.0', 1],
    ['1.10.0', '1.9.0', 1],
    ['2.0.0', '1.99.99', 1],
    ['1.3.9', '1.4.0', -1],
    ['1.5.0-beta.1', '1.4.0', 1],
  ])('%s vs %s is %s', (a, b, expected) => {
    expect(Math.sign(compareVersions(a, b))).toBe(expected);
  });
});

describe('evaluateExceptions', () => {
  it('is silent when nothing needs attention', () => {
    expect(evaluateExceptions([exception], { 'node-forge': '1.4.0' }, today)).toEqual([]);
  });

  it('reports a published fix', () => {
    const m = evaluateExceptions([exception], { 'node-forge': '1.4.1' }, today);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/fixed version of node-forge/);
    expect(m[0]).toMatch(/remove the GHSA-86w9-cpqp-85rv exception/);
  });

  it('warns in the last week before expiry', () => {
    const m = evaluateExceptions(
      [exception],
      { 'node-forge': '1.4.0' },
      new Date('2026-10-26T00:00:00Z'),
    );
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/expires in 7 day\(s\)/);
    expect(m[0]).toMatch(/owner's explicit approval/);
  });

  it('does not warn earlier than the last week', () => {
    expect(
      evaluateExceptions([exception], { 'node-forge': '1.4.0' }, new Date('2026-10-24T00:00:00Z')),
    ).toEqual([]);
  });

  it('reports an expired exception', () => {
    const m = evaluateExceptions(
      [exception],
      { 'node-forge': '1.4.0' },
      new Date('2026-11-02T00:00:00Z'),
    );
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/EXPIRED on 2026-11-01/);
  });

  it('reports both a fix and an approaching expiry', () => {
    const m = evaluateExceptions(
      [exception],
      { 'node-forge': '1.5.0' },
      new Date('2026-10-30T00:00:00Z'),
    );
    expect(m).toHaveLength(2);
  });

  it('does not report a fix when the latest version is unknown (offline)', () => {
    expect(evaluateExceptions([exception], {}, today)).toEqual([]);
  });

  it('works without a fixedAfter field', () => {
    const { fixedAfter, ...noFix } = exception;
    expect(fixedAfter).toBe('1.4.0');
    expect(evaluateExceptions([noFix], { 'node-forge': '9.9.9' }, today)).toEqual([]);
  });

  it('handles no exceptions', () => {
    expect(evaluateExceptions([], {}, today)).toEqual([]);
  });
});
