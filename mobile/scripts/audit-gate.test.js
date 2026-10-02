const { collectAdvisories, evaluate } = require('./audit-gate');

const report = {
  vulnerabilities: {
    'node-forge': {
      via: [
        {
          name: 'node-forge',
          severity: 'high',
          title: 'RSA PKCS#1 v1.5 signature verification issue',
          url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
        },
      ],
    },
    expo: { via: ['node-forge'] }, // transitive entries are plain strings and are ignored
    'decode-uri-component': {
      via: [
        {
          name: 'decode-uri-component',
          severity: 'moderate',
          title: 'DoS',
          url: 'https://github.com/advisories/GHSA-vcc3-ghjq-m6fr',
        },
      ],
    },
  },
};

const today = new Date('2026-10-02T00:00:00Z');
const exception = { id: 'GHSA-86w9-cpqp-85rv', reason: 'dev tooling only', expires: '2026-11-01' };

describe('audit gate', () => {
  it('extracts advisory ids and severities, ignoring transitive string entries', () => {
    const ids = collectAdvisories(report).map((a) => a.id);
    expect(ids).toEqual(['GHSA-86w9-cpqp-85rv', 'GHSA-vcc3-ghjq-m6fr']);
  });

  it('fails on a high advisory with no exception', () => {
    const r = evaluate(report, [], today);
    expect(r.failures.map((f) => f.id)).toEqual(['GHSA-86w9-cpqp-85rv']);
  });

  it('does not block on moderate advisories', () => {
    const r = evaluate(report, [exception], today);
    expect(r.failures).toEqual([]);
  });

  it('passes a high advisory covered by an unexpired exception, and reports it', () => {
    const r = evaluate(report, [exception], today);
    expect(r.failures).toEqual([]);
    expect(r.excepted.map((a) => a.id)).toEqual(['GHSA-86w9-cpqp-85rv']);
  });

  it('applies the exception through its whole expiry day, then stops', () => {
    expect(evaluate(report, [exception], new Date('2026-11-01T12:00:00Z')).failures).toEqual([]);
    const after = evaluate(report, [exception], new Date('2026-11-02T00:00:00Z'));
    expect(after.failures.map((f) => f.id)).toEqual(['GHSA-86w9-cpqp-85rv']);
    expect(after.expired).toEqual([exception]);
  });

  it('never excuses a different advisory', () => {
    const other = { ...exception, id: 'GHSA-xxxx-xxxx-xxxx' };
    expect(evaluate(report, [other], today).failures).toHaveLength(1);
  });

  it('passes a clean report', () => {
    expect(evaluate({ vulnerabilities: {} }, [], today).failures).toEqual([]);
  });
});
