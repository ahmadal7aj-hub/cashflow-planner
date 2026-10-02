'use strict';

/**
 * Dependency audit gate (BRD section 9: high/critical vulnerabilities block release unless formally
 * risk-accepted). Runs `npm audit --omit=dev --json` and fails on any high or critical advisory EXCEPT
 * those listed in `audit-exceptions.json`, which must name the advisory id, a reason and an expiry date.
 * An expired exception stops applying, so the gate fails again and forces a re-decision.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BLOCKING = new Set(['high', 'critical']);

/** Pull advisory ids (GHSA-...) and severities out of an npm audit JSON report. */
function collectAdvisories(report) {
  const found = new Map();
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== 'object' || !via.url) continue;
      const id = via.url.split('/').pop();
      found.set(id, { id, severity: via.severity, title: via.title, pkg: via.name });
    }
  }
  return [...found.values()];
}

/**
 * @param report   parsed `npm audit --json` output
 * @param exceptions array of { id, reason, expires: 'YYYY-MM-DD' }
 * @param today    a Date (injected so tests are deterministic)
 */
function evaluate(report, exceptions, today) {
  const active = new Map();
  const expired = [];
  for (const e of exceptions) {
    if (new Date(`${e.expires}T23:59:59Z`) >= today) active.set(e.id, e);
    else expired.push(e);
  }
  const blocking = collectAdvisories(report).filter((a) => BLOCKING.has(a.severity));
  const excepted = blocking.filter((a) => active.has(a.id));
  const failures = blocking.filter((a) => !active.has(a.id));
  return { failures, excepted, expired };
}

function main() {
  // A single command string with the shell enabled works on Windows and Linux and avoids argument escaping.
  const res = spawnSync('npm audit --omit=dev --json', {
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const report = JSON.parse(res.stdout || '{}');
  const exceptionsPath = path.join(__dirname, '..', 'audit-exceptions.json');
  const exceptions = fs.existsSync(exceptionsPath)
    ? JSON.parse(fs.readFileSync(exceptionsPath, 'utf8'))
    : [];
  const { failures, excepted, expired } = evaluate(report, exceptions, new Date());

  for (const e of excepted) {
    console.log(
      `RISK-ACCEPTED until ${exceptions.find((x) => x.id === e.id).expires}: ${e.id} (${e.pkg}) ${e.title}`,
    );
  }
  for (const e of expired)
    console.log(`EXPIRED exception no longer applies: ${e.id} (expired ${e.expires})`);
  if (failures.length > 0) {
    for (const f of failures)
      console.error(`BLOCKING ${f.severity}: ${f.id} (${f.pkg}) ${f.title}`);
    process.exit(1);
  }
  console.log('Dependency audit gate passed.');
}

if (require.main === module) main();
module.exports = { collectAdvisories, evaluate };
