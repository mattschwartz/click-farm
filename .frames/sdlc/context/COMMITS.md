# Commit Format

All commits in this project follow this format:

```
<type>(task #<id>): <short description>
```

The `task #<id>` is omitted when there is no associated task (e.g. human tweaks to behavior files).

## Types

| Type | When to use |
|------|-------------|
| `feat` | New game behavior or UI the player experiences |
| `fix` | Corrects something broken |
| `chore` | Tooling, config, tasks.json updates — no player-facing change |
| `design` | Proposal or UX spec written to disk |
| `arch` | Architecture spec written or updated |
| `test` | Tests added or updated with no other change |
| `refactor` | Code restructured without behavior change |

## How to commit

Commit messages are a single line. Always use `-m` — never a heredoc or temp file:

```bash
git commit -m "feat(task #12): implement generator tick loop"
```

## What to stage

You MUST stage only the files you personally modified during this session. Nothing else.

```bash
# Right — explicit file paths only
git add client/src/game-loop/index.ts client/src/game-loop/index.test.ts

# Wrong — stages everything, including files you didn't touch
git add -A
git add .
```

Before committing, run `git status` and review every staged file. If a file appears that you did not intentionally modify, do NOT include it. Unstage it with `git restore --staged <file>` and leave it for whoever owns that change.

When in doubt: less is more. A commit that's missing a file can be followed up. A commit that includes someone else's unfinished work cannot easily be undone.

## Examples

```
feat(task #12): implement generator tick loop
fix(task #23): correct follower decay on scandal resolve
chore(task #8): update tasks.json — mark complete
design(task #31): add core-game-screen ux spec
arch(task #5): write scandal system architecture doc
test(task #18): add unit tests for clout calculation
refactor(task #27): extract platform state into own module
```
