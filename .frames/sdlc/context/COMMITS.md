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
