'use strict';

/**
 * Weekly watch over the risk-accepted dependency exceptions in `audit-exceptions.json`.
 * It prints a message (and nothing else) when a human needs to look:
 *   - a fixed version has been published (latest > `fixedAfter`), so the exception can be removed;
 *   - the exception expires within WARN_DAYS days, or has already expired.
 * Silence means "nothing to do". The workflow turns any output into a GitHub issue.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const WARN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Compare x.y.z versions numerically (pre-release tags are ignored). Returns -1, 0 or 1. */
function compareVersions(a, b) {
  const pa = a.split('-')[0].split('.').map(Number);
  const pb = b.split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * @param exceptions array of { id, package, fixedAfter?, expires }
 * @param latest     map of package name -> latest published version
 * @param today      a Date (injected so tests are deterministic)
 */
function evaluateExceptions(exceptions, latest, today) {
  const messages = [];
  for (const e of exceptions) {
    const pkg = e.package || e.id;
    const latestVersion = latest[e.package];
    if (e.fixedAfter && latestVersion && compareVersions(latestVersion, e.fixedAfter) > 0) {
      messages.push(
        `A fixed version of ${pkg} appears to be published (latest ${latestVersion}, advisory covers up to ${e.fixedAfter}). ` +
          `Upgrade it and remove the ${e.id} exception from mobile/audit-exceptions.json.`,
      );
    }
    const expiresAt = new Date(`${e.expires}T23:59:59Z`);
    const daysLeft = Math.ceil((expiresAt - today) / DAY_MS);
    // Compare the dates directly: Math.ceil of a tiny negative number is -0, which is not < 0.
    if (expiresAt < today) {
      messages.push(
        `The risk exception for ${e.id} (${pkg}) EXPIRED on ${e.expires}. CI now fails until it is fixed or the owner renews it.`,
      );
    } else if (daysLeft <= WARN_DAYS) {
      messages.push(
        `The risk exception for ${e.id} (${pkg}) expires in ${daysLeft} day(s), on ${e.expires}. ` +
          `Ask the owner to renew it, or remove it once a fix exists. Renewal needs the owner's explicit approval.`,
      );
    }
  }
  return messages;
}

function latestVersionOf(pkg) {
  const res = spawnSync(`npm view ${pkg} version`, { encoding: 'utf8', shell: true });
  return res.status === 0 ? res.stdout.trim() : undefined;
}

function main() {
  const file = path.join(__dirname, '..', 'audit-exceptions.json');
  const exceptions = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const latest = {};
  for (const e of exceptions) {
    if (e.package && !(e.package in latest)) latest[e.package] = latestVersionOf(e.package);
  }
  const messages = evaluateExceptions(exceptions, latest, new Date());
  if (process.env.TEST_MODE === '1') {
    messages.unshift(
      'TEST: this is a test of the weekly exception watch. No action needed; close this issue.',
    );
  }
  if (messages.length > 0) console.log(messages.map((m) => `- ${m}`).join('\n'));
}

if (require.main === module) main();
module.exports = { compareVersions, evaluateExceptions };
