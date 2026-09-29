# P00 verification

| Requirement | Automated proof | Manual proof | Status | Notes |
| --- | --- | --- | --- | --- |
| Fresh install/start | `pnpm install --frozen-lockfile` passed; `pnpm test:e2e` started local app | Fresh clone check pending | PARTIAL | Exact lockfile installed. |
| Strict typecheck | `pnpm typecheck` passed | n/a | PASS | `strict: true`. |
| Lint and format | `pnpm lint`, `pnpm format:check` passed | n/a | PASS | Zero lint warnings. |
| Unit smoke | `pnpm test` passed | n/a | PASS | 4 environment tests. |
| Playwright smoke | `pnpm test:e2e` passed | 320, 360, 390, 768, 1024, 1440px checked | PASS | 1 Chromium test, no page overflow. |
| Production build | `pnpm build` passed | n/a | PASS | Static `/` and `/_not-found`. |
| Secret and junk review | Staged credential scan clean; `.env.example` has 0 filled assignments | Staged tree reviewed | PASS | Direct dependency licenses reviewed. |
| One application | One root `package.json`; no nested manifests | Tree reviewed | PASS | Generated `AGENTS.md` and `CLAUDE.md` read. |
| No fake feature data | Source tree inspected | No feature data or provider implementation | PASS | Only foundation page and empty future directories. |
| MCP availability | Tool inventory inspected | Supabase/Vercel project connection not proven | DOCUMENTED | App plugins listed, project tools not exposed. |

## Exact command log

- `git status --short --branch` before initialization: failed, no Git repository existed.
- `git -c safe.directory=C:/SupportSphere status --short --branch`: passed after initialization; no commits yet and only new source files.
- `node --version`: 24.19.0.
- `pnpm --version`: 11.25.0.
- `pnpm view next version`: 16.3.7.
- `pnpm view react version`: 19.3.0.
- `pnpm view tailwindcss version`: 4.3.3.
- `pnpm view typescript version`: 7.0.2; project will pin TypeScript 5.9 for conservative Next.js compatibility.
- `pnpm view vitest version`: 5.0.2.
- `pnpm view @playwright/test version`: 1.63.0.
- `pnpm install --frozen-lockfile`: passed, already up to date.
- `pnpm peers check`: passed, no peer dependency issues.
- `pnpm typecheck`: passed after replacing `NodeJS.ProcessEnv` test input typing with a narrow record.
- `pnpm lint`: passed without warnings after config repair.
- `pnpm format:check`: passed.
- `pnpm test`: passed, 1 file / 4 tests.
- `pnpm exec playwright install chromium`: passed.
- `pnpm test:e2e`: passed, 1 test across six viewport widths; Playwright started `next dev` on port 3100.
- `pnpm build`: passed, Next.js 16.3.7 optimized static build.
- Secret pattern scan (filenames only) found no matches; `.env.example` had 0 non-empty assignments; nested package manifests: 0.
- Direct dependency license inspection: Next/React/Zod/server-only/Tailwind/ESLint/Prettier/Vitest MIT; TypeScript and Playwright Apache-2.0.
- `git diff --cached --check`: passed after preserving seven supplied Markdown hard breaks with `<br>`.
- Staged credential scan: no matches; only `.env.example` tracked; `node_modules`, `.next`, `tsconfig.tsbuildinfo`, and `test-results` ignored.

Only executed checks count as proof. A fresh clone and final gate remain.
