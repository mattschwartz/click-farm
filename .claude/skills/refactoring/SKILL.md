---
name: refactoring
description: Safe refactoring procedure. Use when restructuring code without changing behavior — renames, extractions, moves, interface changes. Enforces small mechanical steps with verification between each one.
user-invocable: true
---

# Safe Refactoring

Change the shape of code without changing what it does. Every step is small, mechanical, and verified before the next one begins.

## When to Use This

- Renaming a function, variable, type, or file
- Extracting a function, component, or module
- Moving code between files or directories
- Changing an interface or data shape while preserving behavior
- Consolidating duplicated logic
- Cleaning up imports, dead code, or structural debt

## When NOT to Use This

- Adding new behavior — that's a build task
- Fixing a bug — the behavior is changing, so this procedure's "tests shouldn't change" rule doesn't apply
- Changing behavior AND structure in the same pass — split it. Fix the behavior first (or after), refactor separately.

## Steps

### 1. Establish Green

Run the full test suite before touching anything.

**Constraints:**
- You MUST run `cd client && npm test` (or the project's equivalent) and confirm all tests pass
- If any tests are failing, STOP. You are not refactoring — you are starting from a broken baseline. Fix the failures first or flag them to the user.
- You MUST NOT skip this step, because if tests fail after your change you need to know whether you broke them or they were already broken

### 2. State the Goal

Name the refactoring in one sentence. What is changing structurally and why.

**Constraints:**
- You MUST describe the structural change to the user before beginning, because refactoring without a stated goal drifts into rewriting
- You SHOULD name which files will be touched, because surprises during refactoring mean you didn't understand the scope
- If the scope involves more than ~5 files, You SHOULD break it into smaller refactorings and do them sequentially, because large refactorings are where things go wrong

### 3. Find Every Reference

Before changing anything, find every place the thing you're changing is used.

**Constraints:**
- You MUST grep for the symbol, file path, or pattern you're about to change — do NOT rely on memory or assumption, because agents consistently miss the 4th or 5th reference
- You MUST check: source files, test files, imports, type definitions, config files, documentation, and string literals that reference the thing by name
- You SHOULD record the reference count so you can verify after the change that you caught them all
- If the thing is exported or part of a public interface, You MUST trace every consumer, because an internal rename is safe but an interface rename has a blast radius

### 4. One Transformation at a Time

Apply exactly one mechanical change. Then stop.

**Constraints:**
- You MUST make only ONE type of transformation per pass. Choose one:
  - Rename (change the name, update all references)
  - Extract (pull code into a new function/module, replace original with a call)
  - Move (relocate to a different file/directory, update all imports)
  - Inline (replace a call with its body, remove the original)
  - Change signature (add/remove/reorder parameters, update all call sites)
- You MUST NOT combine transformations. Rename then extract is two passes, not one. This feels slow. It is correct.
- You MUST NOT change behavior during a transformation. If a test needs to change, ask yourself: am I actually changing behavior? If yes, stop — that's not a refactoring step.
- The ONE exception where tests change: when a test is testing internal structure (e.g., import paths, private function names) rather than behavior. If you change a test, you MUST note why and confirm the test is still testing the same behavior.

### 5. Verify

Run the full test suite. Check types. Confirm the reference count.

**Constraints:**
- You MUST run the full test suite after every transformation — not just the tests near your change, because refactoring breaks things at a distance
- You MUST run the type checker (`npx tsc --noEmit` or equivalent) if the project uses TypeScript, because type errors from refactoring are silent until they aren't
- You SHOULD grep for the old name/path to confirm zero remaining references, because a leftover reference is a broken reference
- If anything fails, You MUST fix it before moving to the next transformation. Do NOT accumulate breakage across steps, because the whole point of small steps is that failures are immediately attributable

### 6. Repeat or Finish

If the refactoring goal from Step 2 is not yet achieved, return to Step 4 with the next transformation. If it's done, proceed to commit.

**Constraints:**
- You MUST NOT add "while I'm here" changes. If you notice something else that needs refactoring, note it for a separate pass. Scope discipline is the skill.
- Before committing, You MUST run the full test suite one final time, because the sum of individually-passing steps can still produce a broken whole (rare, but possible with stateful test setups)

### 7. Commit

**Constraints:**
- You MUST stage only the files you modified — use explicit file paths with `git add`, never `git add -A` or `git add .`
- The commit message MUST describe the structural change, not the motivation. "Rename calculateDust to computeDustValue" not "clean up pricing code"
- If the refactoring was multiple transformations, a single commit is fine as long as all tests pass. The small steps are for safety during the work, not for commit granularity.

## Troubleshooting

### Tests fail after a transformation
You broke something. The last transformation is the cause — you only did one thing. Look at exactly what you changed, grep for any references you missed, and fix it before continuing. Do NOT proceed to the next step with failing tests.

### You realize behavior needs to change too
Stop the refactoring. Commit what you have (if it's green). Do the behavior change as a separate task. Come back and continue the refactoring after.

### The scope grew
You started renaming one function and now you're three files deep in a chain of renames. This is normal. Each rename is its own Step 4-5 cycle. The discomfort of doing them one at a time is the discipline working.

### You're not sure if it's a refactoring or a behavior change
Ask: would the existing tests still pass without modification? If yes, it's a refactoring. If no, some behavior is changing — separate the behavior change from the structural change.
