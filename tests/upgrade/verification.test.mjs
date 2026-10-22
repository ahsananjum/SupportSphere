import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { checkDocuments, runBounded } from '../../scripts/verify-upgrade.mjs';
import { localTarget } from './local-target.mjs';

const files = execFileSync(
  'git',
  ['ls-files', '-c', '-o', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .trim()
  .split(/\r?\n/);
const documents = new Map(
  files
    .filter((file) => file.endsWith('.md'))
    .map((file) => [file, fs.readFileSync(file, 'utf8')]),
);
const check = (docs) =>
  checkDocuments(
    docs,
    (file) => fs.existsSync(file),
    (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''),
  );

test('UP-U0-08: current docs have complete ID/link/test coverage', () =>
  assert.deepEqual(check(documents).failures, []));
test('UP-U0-08: missing IDs and broken links fail', () => {
  const docs = new Map(documents);
  docs.set(
    '.agent/UPGRADE_PROGRESS.md',
    docs.get('.agent/UPGRADE_PROGRESS.md').replace(/^\| U0\.1\s.*\n/m, ''),
  );
  docs.set('docs/broken-test.md', '[missing](nonexistent-u0-proof.md)');
  const failures = check(docs).failures;
  assert(failures.some((failure) => failure.includes('coverage differs')));
  assert(failures.some((failure) => failure.includes('broken link')));
});

test('UP-U1-06: completion checks result evidence rather than pending-state acceptance wording', () => {
  const docs = new Map(documents);
  docs.set(
    '.agent/UPGRADE_PROGRESS.md',
    docs
      .get('.agent/UPGRADE_PROGRESS.md')
      .replace(/(\| U1\.2\s+\|[^|]+\|)[^|]+/, '$1 COMPLETE '),
  );
  docs.set(
    '.agent/UPGRADE_TEST_MATRIX.md',
    docs
      .get('.agent/UPGRADE_TEST_MATRIX.md')
      .split('\n')
      .map((line) => {
        if (!line.startsWith('| UP-U1-02 |')) return line;
        const cells = line.split('|');
        cells[cells.length - 2] = ' PASS — verified fixture ';
        return cells.join('|');
      })
      .join('\n'),
  );
  assert.deepEqual(check(docs).failures, []);
  docs.set(
    '.agent/UPGRADE_TEST_MATRIX.md',
    docs
      .get('.agent/UPGRADE_TEST_MATRIX.md')
      .replace('PASS — verified fixture', 'PASS — pending proof'),
  );
  assert(
    check(docs).failures.some((f) =>
      f.includes('U1.2: completion lacks passing evidence'),
    ),
  );
});
test('UP-U0-08: command failure and timeout never pass', () => {
  assert.equal(runBounded(['-e', 'process.exit(7)']).passed, false);
  const timeout = runBounded(['-e', 'setInterval(() => {}, 1000)'], {
    timeout: 100,
  });
  assert.equal(timeout.passed, false);
  assert.equal(timeout.timedOut, true);
});

test('UP-U1-06: stale phase roll-up cannot contradict verified slices', () => {
  const docs = new Map(documents);
  docs.set(
    '.agent/UPGRADE_PROGRESS.md',
    docs
      .get('.agent/UPGRADE_PROGRESS.md')
      .replace(/(\| U1\s+\|)[^|]+/, '$1 NOT_STARTED '),
  );
  assert(
    check(docs).failures.some((f) =>
      f.includes('U1: roll-up contradicts slice progress'),
    ),
  );
});
test('UP-U0-08: absent isolated opt-in fails before discovering credentials', () => {
  const old = process.env.RUN_UPGRADE_LOCAL;
  delete process.env.RUN_UPGRADE_LOCAL;
  try {
    assert.throws(() => localTarget(), /explicitly/);
  } finally {
    if (old !== undefined) process.env.RUN_UPGRADE_LOCAL = old;
  }
});
