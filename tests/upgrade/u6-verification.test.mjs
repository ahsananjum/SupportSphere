import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkBuildProof,
  runBounded,
  u6Environment,
  u6Isolated,
  u6Browser,
} from '../../scripts/verify-upgrade.mjs';

test('UP-U6-01: stale source, replaced build and missing build proof cannot pass browser preflight', () => {
  const proof = { sourceSha256: 'a', buildId: 'b' };
  assert.equal(checkBuildProof(proof, 'a', 'b'), true);
  for (const [value, source, build] of [
    [null, 'a', 'b'],
    [proof, 'changed', 'b'],
    [proof, 'a', 'replaced'],
    [{ sourceSha256: 'a', buildId: '' }, 'a', ''],
  ])
    assert.equal(checkBuildProof(value, source, build), false);
});
test('UP-U6-02: consolidated isolated and browser plans retain scale, concurrency and policy suites', () => {
  assert.equal(new Set(u6Isolated).size, u6Isolated.length);
  assert(u6Isolated.includes('tests/upgrade/u2-override.test.ts'));
  assert(u6Isolated.includes('tests/upgrade/u3-policy-boundaries.test.ts'));
  assert(
    u6Isolated.includes('tests/upgrade/u4-webhook-role-persistence.test.ts'),
  );
  assert(u6Browser.includes('tests/upgrade/u0-browser.test.ts'));
  assert(u6Browser.includes('tests/upgrade/u2-keyboard-browser.test.ts'));
});
test('UP-U6-08: resumed full run drops inherited focus/baseline and remote-target switches', () => {
  const env = u6Environment({
    U1_FROM: '7',
    U2_SLICE: '5',
    U5_BASELINE: '1',
    U1_STYLE_CAPTURE: '1',
    P07_LIVE_TEST_PROJECT_REF: 'remote',
    P12_LIVE_BASE_URL: 'https://remote.invalid',
    RUN_UPGRADE_LOCAL: '1',
  });
  assert.deepEqual(env, {
    RUN_UPGRADE_LOCAL: '1',
    UPGRADE_BROWSER_PRODUCTION: '1',
  });
});
test('UP-U6-08: nonzero exit and timed-out command remain failures during recovery', () => {
  assert.equal(runBounded(['-e', 'process.exit(3)']).passed, false);
  const result = runBounded(['-e', 'setInterval(()=>{},1000)'], {
    timeout: 100,
  });
  assert.equal(result.passed, false);
  assert.equal(result.timedOut, true);
});
test('UP-U6-07: local build proof carries no provider or deployment success claim', () => {
  assert.equal(
    checkBuildProof(
      { revision: 'deployed', sourceSha256: 'old', buildId: 'x' },
      'current',
      'x',
    ),
    false,
  );
});
