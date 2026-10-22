import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { localTarget, localAppEnv } from '../tests/upgrade/local-target.mjs';

export const coverage = {
  'U6.1': ['tests/upgrade/u6-verification.test.mjs'],
  'U6.2': [
    'tests/upgrade/u6-verification.test.mjs',
    'tests/upgrade/u2-persistence.test.ts',
    'tests/upgrade/u2-override.test.ts',
    'tests/upgrade/u3-policy-boundaries.test.ts',
    'tests/upgrade/u4-automation-persistence.test.ts',
    'tests/upgrade/u4-webhook-role-persistence.test.ts',
  ],
  'U6.3': [
    'tests/upgrade/u6-browser.test.ts',
    'tests/upgrade/u2-keyboard-browser.test.ts',
  ],
  'U6.4': [
    'tests/unit/analytics-cohorts.test.ts',
    'tests/upgrade/u0-persistence.test.ts',
    'tests/upgrade/u6-metrics.test.ts',
  ],
  'U6.5': ['tests/upgrade/u6-browser.test.ts'],
  'U6.6': ['tests/upgrade/u6-browser.test.ts'],
  'U6.7': ['tests/upgrade/u6-verification.test.mjs'],
  'U6.8': ['tests/upgrade/u6-verification.test.mjs'],
  'U5.1': ['tests/upgrade/u5-auth-browser.test.ts'],
  'U5.2': ['tests/upgrade/u5-surfaces-browser.test.ts'],
  'U5.3': ['tests/upgrade/u5-surfaces-browser.test.ts'],
  'U5.4': [
    'tests/upgrade/u5-surfaces-browser.test.ts',
    'tests/unit/widget-presentation.test.ts',
  ],
  'U5.5': ['tests/upgrade/u5-surfaces-browser.test.ts'],
  'U5.6': ['tests/upgrade/u5-surfaces-browser.test.ts'],
  'U4.7': [
    'tests/upgrade/u4-automation-persistence.test.ts',
    'tests/upgrade/u4-webhook-role-persistence.test.ts',
    'tests/unit/automated-action.test.ts',
  ],
  'U4.6': ['tests/upgrade/u4-browser.test.ts'],
  'U4.5': [
    'tests/upgrade/u4-browser.test.ts',
    'tests/upgrade/u4-webhook-role-persistence.test.ts',
  ],
  'U4.4': [
    'tests/upgrade/u4-browser.test.ts',
    'tests/upgrade/u4-automation-persistence.test.ts',
  ],
  'U4.3': [
    'tests/upgrade/u4-browser.test.ts',
    'tests/upgrade/u4-webhook-role-persistence.test.ts',
    'tests/unit/webhooks.test.ts',
  ],
  'U4.2': [
    'tests/upgrade/u4-browser.test.ts',
    'tests/upgrade/u4-automation-persistence.test.ts',
    'tests/unit/automated-action.test.ts',
  ],
  'U4.1': ['tests/upgrade/u4-browser.test.ts', 'tests/unit/automation.test.ts'],
  'U3.7': [
    'tests/unit/ai-workflow.test.ts',
    'tests/upgrade/u3-policy-boundaries.test.ts',
    'tests/upgrade/u3-ai-browser.test.ts',
    'tests/upgrade/u3-policy-browser.test.ts',
  ],
  'U3.6': [
    'tests/unit/ai-policy.test.ts',
    'tests/upgrade/u3-policy-browser.test.ts',
  ],
  'U3.5': [
    'tests/unit/ai-review.test.ts',
    'tests/upgrade/u3-ai-browser.test.ts',
  ],
  'U3.4': ['tests/upgrade/u3-ai-browser.test.ts'],
  'U3.3': [
    'tests/unit/ai-evidence.test.ts',
    'tests/upgrade/u3-ai-browser.test.ts',
  ],
  'U3.2': [
    'tests/unit/knowledge-readiness.test.ts',
    'tests/upgrade/u3-knowledge-browser.test.ts',
  ],
  'U3.1': [
    'tests/unit/knowledge-library.test.ts',
    'tests/upgrade/u3-knowledge-browser.test.ts',
  ],
  'U2.5': [
    'tests/upgrade/u2-workflow-browser.test.ts',
    'tests/upgrade/u2-persistence.test.ts',
  ],
  'U2.6': [
    'tests/unit/support-actions.test.ts',
    'tests/upgrade/u2-workflow-browser.test.ts',
    'tests/upgrade/u2-persistence.test.ts',
  ],
  'U2.7': [
    'tests/unit/support-timeline.test.ts',
    'tests/upgrade/u2-workflow-browser.test.ts',
  ],
  'U2.8': [
    'tests/unit/support-overview.test.ts',
    'tests/upgrade/u2-workflow-browser.test.ts',
  ],
  'U2.9': [
    'tests/upgrade/u2-override.test.ts',
    'tests/upgrade/u2-workflow-browser.test.ts',
    'tests/unit/automated-action.test.ts',
  ],
  'U2.2': ['tests/upgrade/u2-workflow-browser.test.ts'],
  'U2.3': [
    'tests/upgrade/u2-workflow-browser.test.ts',
    'tests/upgrade/u2-keyboard-browser.test.ts',
  ],
  'U2.4': ['tests/upgrade/u2-workflow-browser.test.ts'],
  'U2.1': [
    'tests/unit/support-list-navigation.test.ts',
    'tests/upgrade/u2-browser.test.ts',
  ],
  'U0.1': [
    'tests/unit/support-actions.test.ts',
    'tests/upgrade/u0-persistence.test.ts',
    'tests/upgrade/u0-browser.test.ts',
  ],
  'U0.2': ['tests/upgrade/u0-browser.test.ts'],
  'U0.3': [
    'tests/unit/support-presentation.test.ts',
    'tests/upgrade/u0-browser.test.ts',
  ],
  'U0.4': [
    'tests/unit/analytics.test.ts',
    'tests/unit/analytics-cohorts.test.ts',
    'tests/upgrade/u0-browser.test.ts',
  ],
  'U0.5': ['tests/upgrade/u0-persistence.test.ts'],
  'U0.6': ['tests/upgrade/u0-persistence.test.ts'],
  'U0.7': [
    'tests/unit/support-queries.test.ts',
    'tests/upgrade/u0-browser.test.ts',
  ],
  'U0.8': ['tests/upgrade/verification.test.mjs'],
  'U1.1': ['tests/upgrade/u1-browser.test.ts'],
  'U1.2': [
    'tests/upgrade/u1-browser.test.ts',
    'tests/unit/ui-presentation.test.ts',
  ],
  'U1.3': [
    'tests/upgrade/u1-browser.test.ts',
    'tests/unit/ui-presentation.test.ts',
  ],
  'U1.4': ['tests/upgrade/u1-browser.test.ts'],
  'U1.5': ['tests/upgrade/u1-browser.test.ts'],
  'U1.6': [
    'tests/upgrade/u1-browser.test.ts',
    'tests/upgrade/u1-style.test.ts',
  ],
  'U1.7': [
    'tests/upgrade/u1-browser.test.ts',
    'tests/unit/automated-action.test.ts',
  ],
};

export function checkDocuments(
  documents,
  exists,
  read = (name) => documents.get(name),
) {
  const failures = [];
  const ids = (name, pattern) =>
    [...(documents.get(name) ?? '').matchAll(pattern)].map((match) => match[1]);
  const roadmap = ids('docs/upgrade-roadmap.md', /^\| (U\d\.\d+)\s/gm);
  const progress = ids('.agent/UPGRADE_PROGRESS.md', /^\| (U\d\.\d+)\s/gm);
  const matrix = ids(
    '.agent/UPGRADE_TEST_MATRIX.md',
    /^\| UP-(U\d-\d+)\s/gm,
  ).map((id) => id.replace(/-(\d+)$/, (_, n) => '.' + Number(n)));
  for (const [label, values] of [
    ['roadmap', roadmap],
    ['progress', progress],
    ['matrix', matrix],
  ]) {
    if (!values.length || new Set(values).size !== values.length)
      failures.push(`${label}: missing/duplicate slice IDs`);
    if (
      JSON.stringify([...values].sort()) !== JSON.stringify([...roadmap].sort())
    )
      failures.push(`${label}: slice coverage differs`);
  }
  for (const slice of roadmap) {
    const phase = slice.split('.')[0];
    if (
      !(documents.get(`docs/upgrade-prompts/${phase}.md`) ?? '').includes(slice)
    )
      failures.push(`${slice}: phase prompt missing`);
  }
  for (const line of (documents.get('.agent/UPGRADE_PROGRESS.md') ?? '')
    .split('\n')
    .filter((line) => /^\| U\d\.\d+\s/.test(line))) {
    const cells = line.split('|').map((c) => c.trim());
    if (
      ![
        'NOT_STARTED',
        'IN_PROGRESS',
        'VERIFYING',
        'BLOCKED_MANUAL',
        'COMPLETE',
      ].includes(cells[3])
    )
      failures.push(`${cells[1]}: invalid status`);
    if (cells[3] === 'COMPLETE') {
      const row = (documents.get('.agent/UPGRADE_TEST_MATRIX.md') ?? '')
        .split('\n')
        .find((row) => row.startsWith(`| ${cells[4]} `));
      const evidence =
        row
          ?.split('|')
          .map((cell) => cell.trim())
          .filter(Boolean)
          .at(-1) ?? '';
      if (
        !/^PASS(?:\s|—|$)/.test(evidence) ||
        /NOT_RUN|pending|PARTIAL/i.test(evidence)
      )
        failures.push(`${cells[1]}: completion lacks passing evidence`);
    }
  }
  const progressText = documents.get('.agent/UPGRADE_PROGRESS.md') ?? '';
  for (const line of progressText
    .split('\n')
    .filter((line) => /^\| U\d+\s+\|/.test(line))) {
    const cells = line.split('|').map((cell) => cell.trim());
    const slices = progressText
      .split('\n')
      .filter((row) => row.startsWith(`| ${cells[1]}.`))
      .map((row) => row.split('|')[3].trim());
    if (Number(cells[3]) !== slices.length)
      failures.push(`${cells[1]}: roll-up slice count differs`);
    if (
      (cells[2] === 'COMPLETE' &&
        slices.some((state) => state !== 'COMPLETE')) ||
      (cells[2] === 'NOT_STARTED' &&
        slices.some((state) => state !== 'NOT_STARTED'))
    )
      failures.push(`${cells[1]}: roll-up contradicts slice progress`);
  }
  for (const [name, text] of documents) {
    for (const match of text.matchAll(
      /\[[^\]\n]*\]\(((?:[^()]|\([^()]*\))*)\)/g,
    )) {
      let href = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
      if (!href || /^(?:https?:|mailto:|app:|codex:|plugin:|#)/.test(href))
        continue;
      try {
        href = decodeURIComponent(href);
      } catch {
        failures.push(`${name}: invalid link encoding`);
        continue;
      }
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(name), href.replaceAll('\\', '/')),
      );
      if (!exists(target)) failures.push(`${name}: broken link ${href}`);
    }
  }
  for (const [slice, files] of Object.entries(coverage)) {
    const id =
      'UP-' +
      slice
        .replace('.', '-')
        .replace(/-(\d+)$/, (_, n) => '-' + n.padStart(2, '0'));
    for (const file of files)
      if (!exists(file)) failures.push(`${slice}: test missing ${file}`);
    if (!files.some((file) => (read(file) ?? '').includes(id)))
      failures.push(`${slice}: actual tests lack ${id}`);
  }
  return { slices: roadmap.length, failures };
}

export function runBounded(
  args,
  { timeout = 120_000, env = process.env } = {},
) {
  const start = Date.now();
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    env,
    windowsHide: true,
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    command: ['node', ...args],
    exit: result.status,
    timedOut: result.error?.code === 'ETIMEDOUT',
    passed: result.status === 0 && !result.error,
    diagnostics:
      result.status === 0
        ? undefined
        : (String(result.stdout ?? '') + String(result.stderr ?? ''))
            .slice(-16000)
            .replace(/eyJ[A-Za-z0-9_.-]+/g, '[redacted]'),
    durationMs: Date.now() - start,
    summary: String(result.stdout ?? '')
      .replace(/\u001b\[[0-9;]*m/g, '')
      .split(/\r?\n/)
      .filter((line) =>
        /Test Files|Tests\s|tests |pass |fail |skipped |Duration/.test(line),
      )
      .slice(-10),
  };
}

export const u6Isolated = [
  'tests/upgrade/u0-persistence.test.ts',
  'tests/upgrade/u2-persistence.test.ts',
  'tests/upgrade/u2-override.test.ts',
  'tests/upgrade/u3-policy-boundaries.test.ts',
  'tests/upgrade/u4-automation-persistence.test.ts',
  'tests/upgrade/u4-webhook-role-persistence.test.ts',
  'tests/upgrade/u6-metrics.test.ts',
];
export const u6Browser = [
  'tests/upgrade/u0-browser.test.ts',
  'tests/upgrade/u1-browser.test.ts',
  'tests/upgrade/u2-browser.test.ts',
  'tests/upgrade/u2-workflow-browser.test.ts',
  'tests/upgrade/u2-keyboard-browser.test.ts',
  'tests/upgrade/u3-knowledge-browser.test.ts',
  'tests/upgrade/u3-ai-browser.test.ts',
  'tests/upgrade/u3-policy-browser.test.ts',
  'tests/upgrade/u4-browser.test.ts',
  'tests/upgrade/u5-auth-browser.test.ts',
  'tests/upgrade/u5-surfaces-browser.test.ts',
  'tests/upgrade/u6-browser.test.ts',
];

export function u6Environment(env) {
  const clean = { ...env, UPGRADE_BROWSER_PRODUCTION: '1' };
  for (const key of Object.keys(clean))
    if (
      /^(U[0-6]_(?:FROM|SLICE|BASELINE|STYLE_CAPTURE)|P\d+_.*(?:PROJECT_REF|BASE_URL|ORIGIN))$/.test(
        key,
      )
    )
      delete clean[key];
  return clean;
}

export function sourceDigest(files) {
  const digest = createHash('sha256');
  for (const file of [...files].sort())
    if (
      /^(app\/|components\/|lib\/|public\/|supabase\/functions\/|next.config|package.json|pnpm-lock|tsconfig|postcss|tokens.css)/.test(
        file,
      ) &&
      fs.existsSync(file)
    )
      digest.update(file).update(fs.readFileSync(file));
  return digest.digest('hex');
}

export function checkBuildProof(proof, sourceSha256, buildId) {
  return (
    !!proof &&
    proof.sourceSha256 === sourceSha256 &&
    proof.buildId === buildId &&
    typeof buildId === 'string' &&
    buildId.length > 0
  );
}

function main() {
  const args = process.argv.slice(2);
  const option = (name, fallback) =>
    args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const phase = option('--phase', 'U0'),
    slice = option('--slice', null),
    layer = option('--layer', 'unit');
  if (
    !['U0', 'U1', 'U2', 'U3', 'U4', 'U5', 'U6'].includes(phase) ||
    (slice && (!coverage[slice] || !slice.startsWith(phase + '.'))) ||
    !['unit', 'isolated', 'browser', 'docs', 'gate'].includes(layer)
  )
    throw new Error(
      'Use --phase U0|U1|U2|U3|U4|U5|U6 [--slice matching phase] --layer unit|isolated|browser|docs|gate.',
    );
  const root = process.cwd();
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
  const docs = checkDocuments(
    documents,
    (file) => fs.existsSync(path.join(root, file)),
    (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''),
  );
  const results = [];
  const sourceSha256 = sourceDigest(files);
  if (phase === 'U6' && layer === 'browser') {
    const proofPath = '.next-u0/upgrade-build.json';
    const proof = fs.existsSync(proofPath)
      ? JSON.parse(fs.readFileSync(proofPath, 'utf8'))
      : null;
    const buildId = fs.existsSync('.next-u0/BUILD_ID')
      ? fs.readFileSync('.next-u0/BUILD_ID', 'utf8').trim()
      : '';
    if (!checkBuildProof(proof, sourceSha256, buildId))
      throw new Error(
        'U6 browser requires a current U6 gate build; source/build parity is missing or stale.',
      );
  }
  let target = 'local-process/no-provider',
    env = process.env;
  if (['isolated', 'browser', 'gate'].includes(layer)) {
    const local = localTarget();
    env = localAppEnv(local);
    target = local.url;
  }
  if (phase === 'U6') env = u6Environment(env);
  if (!docs.failures.length && layer !== 'docs') {
    const selected = [
      ...new Set(
        Object.entries(coverage)
          .filter(
            ([id]) => id.startsWith(phase + '.') && (!slice || id === slice),
          )
          .flatMap(([, files]) => files),
      ),
    ];
    const unit = selected.filter((file) => file.startsWith('tests/unit/'));
    if (layer === 'unit') {
      if (
        slice &&
        !unit.length &&
        slice !== 'U0.8' &&
        !['U6.1', 'U6.8'].includes(slice)
      )
        throw new Error(
          `${slice} requires its isolated/browser layer; no unit result can stand in for it.`,
        );
      if (unit.length)
        results.push(
          runBounded(['node_modules/vitest/vitest.mjs', 'run', ...unit], {
            env,
          }),
        );
      results.push(
        runBounded(['--test', 'tests/upgrade/verification.test.mjs'], { env }),
      );
      if (phase === 'U6')
        results.push(
          runBounded(['--test', 'tests/upgrade/u6-verification.test.mjs'], {
            env,
          }),
        );
    } else if (layer === 'isolated')
      results.push(
        runBounded(
          [
            'node_modules/vitest/vitest.mjs',
            'run',
            ...(phase === 'U6'
              ? u6Isolated
              : ['tests/upgrade/u0-persistence.test.ts']),
            ...(['U2', 'U3'].includes(phase)
              ? [
                  'tests/upgrade/u2-persistence.test.ts',
                  'tests/upgrade/u2-override.test.ts',
                  ...(phase === 'U3'
                    ? ['tests/upgrade/u3-policy-boundaries.test.ts']
                    : []),
                  '--no-file-parallelism',
                ]
              : phase === 'U4'
                ? [
                    'tests/upgrade/u4-automation-persistence.test.ts',
                    'tests/upgrade/u4-webhook-role-persistence.test.ts',
                    '--no-file-parallelism',
                  ]
                : []),
          ],
          {
            timeout: ['U2', 'U3', 'U4', 'U6'].includes(phase)
              ? 300_000
              : 150_000,
            env,
          },
        ),
      );
    else if (layer === 'browser')
      results.push(
        runBounded(
          [
            'node_modules/vitest/vitest.mjs',
            'run',
            ...(phase === 'U6'
              ? u6Browser
              : ['U2', 'U3'].includes(phase)
                ? selected.filter((file) => file.includes('browser.test.ts'))
                : phase === 'U5'
                  ? [
                      'tests/upgrade/u5-auth-browser.test.ts',
                      'tests/upgrade/u5-surfaces-browser.test.ts',
                    ]
                  : [`tests/upgrade/${phase.toLowerCase()}-browser.test.ts`]),
            '--no-file-parallelism',
            ...selected.filter((file) => file.endsWith('u1-style.test.ts')),
          ],
          {
            timeout:
              phase === 'U6'
                ? 1_200_000
                : ['U2', 'U3', 'U4'].includes(phase)
                  ? 600_000
                  : 300_000,
            env,
          },
        ),
      );
    else {
      // Fail fast; no automatic migration, reset, remote operation or deployment.
      for (const command of [
        ['node_modules/next/dist/bin/next', 'typegen'],
        ['node_modules/typescript/bin/tsc', '--noEmit'],
        ['node_modules/eslint/bin/eslint.js', '.'],
        ['node_modules/prettier/bin/prettier.cjs', '--check', '.'],
        [
          'node_modules/vitest/vitest.mjs',
          'run',
          'tests/unit',
          'tests/security',
        ],
        [
          'node_modules/next/dist/bin/next',
          'build',
          ...(['U4', 'U6'].includes(phase) ? ['--webpack'] : []),
        ],
      ]) {
        const result = runBounded(command, {
          timeout: 240_000,
          env:
            command[1] === 'build' ? { ...env, NODE_ENV: 'production' } : env,
        });
        results.push(result);
        if (!result.passed) break;
      }
    }
  }
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  const digest = createHash('sha256');
  for (const file of files)
    if (fs.existsSync(file) && fs.statSync(file).isFile())
      digest.update(file).update(fs.readFileSync(file));
  const report = {
    at: new Date().toISOString(),
    phase,
    slice,
    layer,
    target,
    revision,
    sourceSha256,
    worktreeSha256: digest.digest('hex'),
    docs,
    results,
    passed:
      !docs.failures.length &&
      results.every((result) => result.passed) &&
      sourceSha256 === sourceDigest(files),
    limitations:
      'This artifact does not update progress or prove provider/deployment behavior. Reconcile any timed-out child operation before replay.',
  };
  if (phase === 'U6' && layer === 'gate' && report.passed)
    fs.writeFileSync(
      '.next-u0/upgrade-build.json',
      JSON.stringify(
        {
          revision,
          sourceSha256,
          buildId: fs.readFileSync('.next-u0/BUILD_ID', 'utf8').trim(),
          at: report.at,
        },
        null,
        2,
      ) + '\n',
    );
  fs.mkdirSync('test-results/upgrades', { recursive: true });
  const artifact = `test-results/upgrades/${phase}-${layer}-${Date.now()}.json`;
  fs.writeFileSync(artifact, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report, artifact }, null, 2));
  if (!report.passed) process.exitCode = 1;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
