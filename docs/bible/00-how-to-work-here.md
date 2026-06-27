# 00 — How To Work Here (THE METHOD)

> **Read this before you touch anything.** This is not background — it is the operating discipline that
> made this project succeed and the single best defense against a fresh session mis-building. Every other
> section tells you *what* the game is; this one tells you *how to change it without breaking it*. The
> rules below are distilled from `HANDOFF.md`, the global delegate rules, and the pattern this codebase
> was actually built with. Follow them as a checklist, in order, on every task.
>
> Sources cross-checked while writing: `HANDOFF.md`, the user's global `CLAUDE.md` (delegate + account
> rules), the live `package.json` scripts, the `feat/layer3` git remote/credential config, and the
> `sim/` suite. Citations are `file:line` on `feat/layer3`.

---

## The one-screen checklist

1. **Lock the plan first.** Surface decisions as a Q&A batch; get them answered; *then* build. No
   mid-build pivots.
2. **VERIFY before you fix.** Never blind-fix a flagged "bug." Read the cited code and reproduce the claim
   first — flags are often misreads.
3. **Delegate heavy work** (large/hard coding → Cursor `composer-2.5`; review → Codex `gpt-5.5`) — but
   only with an **exhaustive per-file spec**, and only on a **personal/OSS** repo. Claude orchestrates.
4. **Sequential agents only.** One Cursor task at a time on this tree. Never parallel.
5. **GATE before every commit:** `tsc -b` ✓ **and** the full `vitest run` suite ✓ — *including the long
   sims, which are the balance gate.* No exceptions, even for "just tooling."
6. **Mind the accounts.** The git remote is pinned to **vinceee23 (personal)**; the `gh` CLI is the
   **work** account. Never cross them. Push only when asked.
7. **Commit + push only when the user asks.** Branch off `master` if you would otherwise commit to it.

---

## 1. Lock the plan BEFORE building — no mid-build pivots

This project plans comprehensively up front, answers decisions via a Q&A tap-batch, then builds straight
through without pivoting. Mid-build pivots are how the Break phase scope-crept beyond the locked L3 spec
and required a 4-revert reconcile (`HANDOFF.md:7-11`).

- **Decisions get LOCKED in a doc**, not held in your head. The authoritative locked specs are
  `docs/LAYER3-SPEC.md`, `docs/HARDENING-PLAN.md` (LOCKED 2026-06-28), and `docs/RECONCILE-PLAN.md`. When
  a decision is made, write it into the relevant spec so the *next* session cannot re-diverge — that is
  literally why the L3 spec was re-locked (`HANDOFF.md:17`).
- **Surface every open decision as an AskUserQuestion tap-batch** before building, not as prose buried in
  a message. Ambiguity resolved up front is free; ambiguity resolved after a build is a revert.
- **No mid-build pivots.** If new information genuinely invalidates the plan, *stop*, re-batch the
  decision, re-lock, then resume. Do not silently change direction.

---

## 2. VERIFY before fixing — never blind-fix a flagged "bug"

This is the rule with the highest payoff, and it has a cautionary tale in this very repo.

> **The `lifetimeEncorePoints` cautionary tale.** A reset-matrix audit flagged that
> `lifetimeEncorePoints` "should" reset on Magnum Opus and appeared not to. The *correct* move was to
> read the code: `lifetimeEncorePoints` **is** the Encore production multiplier and **does** reset every
> MO exactly as designed (doc and code agree — see section 02). Had it been "fixed" blindly, the fix
> would have *broken* a working, intentional mechanic. The reverse case is just as real: the
> `performTour` "bug" turned out to be a verified-safe misread too (section 06, B-items).

Discipline:

- A flag is a **hypothesis**, not a fact. Open the cited `file:line`, read the surrounding code, and
  reproduce the behavior (a unit test, a sim run, or a console trace) **before** writing a patch.
- Many "divergences" in this codebase are *intentional* design choices that a doc describes loosely. The
  bible's DIVERGENCE tables (sections 02–05) list the known ones — check there first.
- When you confirm something is genuinely wrong, fix the **root cause**, not the symptom. (The
  era-pacing sim failure was correctly diagnosed as an *unfaithful sim model*, not a balance regression,
  and fixed at the model — `HANDOFF.md:15`.)

---

## 3. Delegate heavy work to the CLI dev-team (separate quotas) — with exhaustive specs

By default, offload **hard/large coding, broad searches, and code review** to the external CLIs, which run
on separate quotas. This is the normal way of working here, not a budget escape hatch. The full how-to
(STDIN piping, `--trust`, the versioned-binary quirk) lives in the **`delegate-cli`** skill.

| Role | Tool / model | Invocation |
|---|---|---|
| **Builder** | Cursor / `composer-2.5` | Pipe the prompt via STDIN (the `.cmd` wrapper truncates multi-line `-p`): `cat p.txt \| "$CURSOR" -p --trust --force --model composer-2.5 --output-format text` |
| **Reviewer / QA** | Codex / `gpt-5.5` | `cat p.txt \| codex exec -s read-only --skip-git-repo-check -` |
| **Orchestrator + gate + commit** | Claude (you) | Stays in-session. Never delegate the *commanding* — context + alignment live with you. |

Rules that make delegation work (and the lack of which caused conflicts here):

- **Exhaustive per-file specs only.** Tell the builder exactly which files to touch (disjoint sets),
  what each must do, and to **"report WIRING NEEDED" rather than touch prefabs/shared files**. Vague
  specs produce scope creep — the Break phase is the proof.
- **The loop:** Cursor builds → Codex reviews (MUST-FIX only) → Cursor fixes → **Claude gates** (§5) →
  commit. Claude gates *every* diff before it lands.
- **`cursor-agent` IS installed** at `%LOCALAPPDATA%\cursor-agent\cursor-agent.cmd` (on User PATH).
  Earlier "missing" reports were a Git-Bash `.cmd` resolution quirk — invoke as `cursor-agent.cmd`
  from Bash (`HANDOFF.md:90`).

---

## 4. Sequential Cursor tasks only — no parallel agents on the same tree

**Vince's standing rule:** run Cursor tasks **one at a time** on this working tree. Parallel agents caused
file conflicts (`HANDOFF.md:111`). If you have several independent build tasks, queue them — finish, gate,
and commit one before dispatching the next. (This is about *agents mutating the tree*; read-only searches
can fan out freely.)

---

## 5. ALWAYS gate before commit — `tsc -b` + the FULL vitest suite (the sims are the balance gate)

This is the non-negotiable. **Gate before every commit, even for "just tooling."**

```bash
npm run build      # = tsc -b && vite build   → typecheck MUST pass
npm run test       # = vitest run             → FULL suite, incl. the long sims
```

(Scripts confirmed in `package.json`: `build` → `tsc -b && vite build`; `test` → `vitest run`.)

- **The `sim/` suite is the balance gate, not decoration.** `sim/era-pacing.test.ts`,
  `sim/human-pacing.test.ts`, and `sim/l3-pacing.test.ts` assert real pacing windows (wall-reach times,
  first-MO time, Platinum time, dead-zone bounds). A green typecheck with a red sim is **not** a passing
  gate. The sims that import real game code are authoritative; `sim/engine.mjs` is only an approximate
  tuning *mirror* and its numbers can differ from shipped code (section 01 DIVERGENCE).
- The sims are **slow** (era-pacing ~100s/run at 1M steps). That is expected — budget the time; do not
  skip them to save seconds. A known-acceptable state is recorded in the handoff (e.g. "52 passed, 3
  skipped, 1 failed" with the failure being a *sim-model* issue under active fix, not a game bug —
  `HANDOFF.md:13-15`). Know the current baseline before you change anything so you can tell a *new*
  failure from a *known* one.
- **`it.skip` / env-gated asserts** (`RESIM_*`) are deferred tests with a tracked reason in
  `HANDOFF.md`/`RECONCILE-PLAN.md` — do not delete them; re-enable per their note when the modeled
  mechanic lands.
- After the gate is green, commit. Commit/PR trailers and the branch policy are in the harness rules
  (branch off `master`; never amend unless asked).

---

## 6. Data-policy + account hygiene — do NOT cross personal and work

Two independent traps live on this machine. Both matter.

**(a) Data policy for delegation.** Default-delegate is fine on **personal / OSS** repos. Orchestral
Symphony is Vince's **personal** project, so sending its code to Cursor/Codex is allowed. On an
**employer / confidential** repo (e.g. Walker Advertising) you must confirm external sharing is allowed
**before** sending any code to an external CLI. Check which repo you are in first.

**(b) GitHub accounts.** This repo's git remote is **pinned to `vinceee23` (personal)** —
`origin = https://vinceee23@github.com/vinceee23/orchestral-symphony.git`, and
`credential.https://github.com.username = vinceee23` (both verified locally). The local `user.email` is
the personal Gmail, not the work address. Meanwhile the `gh` CLI on this PC authenticates as the **work**
account.

- **Push with the pinned personal account only. NEVER push this repo with the gh/work account**
  (`HANDOFF.md:115`).
- A "hung" push is usually a hidden Git Credential Manager account-picker window — check
  `Get-Process git-credential-manager`. The remote is already pinned, so this should not recur; if a new
  remote ever lacks a pinned account, the **`gh-pin`** skill fixes it (pin repo-locally, never globally).
- **Commit / push only when the user asks.** Do not push proactively.

---

## 7. Project-specific gotchas worth knowing before you start

- **Two stores.** `gameStore.ts` (persisted game state) and `uiStore.ts` (ephemeral UI: held-conduct,
  celebration, devSpeed) are separate. Don't put game state in the UI store or vice-versa (section 01).
- **Automation orchestration is NOT in pure `calculateTick`.** Auto-encore / auto-MO / auto-tour fire in
  the `tick` action wrapper, so they **do not run during offline replay** — offline is tab-open-idle only
  by design (section 01 DIVERGENCE; `HANDOFF.md:44,46`). Don't "fix" this without a decision.
- **Schema migrations are versioned.** Bump `SAVE_SCHEMA_VERSION` in `saveSchema.ts` and add an ordered
  entry in `saveMigration.ts` when you change persisted shape. The B5 save-migration work is **written
  but uncommitted** (untracked files) — it needs gate-and-commit, not a rebuild (section 06).
- **Dev flags:** `?fresh` (clean slate), `?l3` (unlock World Tour), `?dev` (dev panel). Use `?fresh&l3`
  for a clean L3 test.
- **The LIVE capstone-challenge exploit is unfixed** and is the highest-priority correctness item — do
  not assume it was handled (sections 03 & 06).
- **Gemini key gotcha** (for image tooling): the shell `GEMINI_API_KEY` is stale/exhausted; always read
  the key from `.env`, never `os.environ` (`HANDOFF.md:113`).

---

### TL;DR for the impatient

> Lock the plan → verify before fixing → delegate heavy work with exact specs (sequential agents) →
> **gate `tsc -b` + full `vitest` incl. sims** → commit on the personal account only when asked. The sims
> are the balance gate; a flagged bug is a hypothesis until you read the code.
