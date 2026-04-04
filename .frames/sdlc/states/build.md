# Build Behavior

## Overview

Implement a clearly-defined coding or infrastructure task. The output is working code with passing tests that satisfies the task's done-when condition.

## Parameters

- **task** (required): The task to implement.
- **spec** (optional): Path to the architecture spec or design doc that this task implements against

**Constraints for parameter acquisition:**
- If all required parameters are already provided, You MUST proceed to the Steps
- If any required parameters are missing, You MUST ask for them before proceeding
- When asking for parameters, You MUST request all parameters in a single prompt
- When asking for parameters, You MUST use the exact parameter names as defined

## Steps

### 1. Understand the Task

Read and understand what needs to be built before writing any code.

**Constraints:**
- You MUST read the full task entry including its done-when, dependencies, and source reference, because implementing without understanding the completion condition leads to work that has to be redone
- If the task references an architecture spec, You MUST read the spec before writing code, because the spec defines the contracts your implementation must satisfy
- If the task references a proposal, You SHOULD read the proposal for context on the *why* behind the task, because understanding intent helps you make correct judgment calls during implementation
- You MUST verify that all dependencies listed on the task are marked complete, because building on top of incomplete work creates integration failures
- If any dependency is not complete, You MUST stop and inform the user — do NOT begin implementation, because the task is not ready

### 2. Confirm the Approach

Before writing code, confirm your implementation approach.

**Constraints:**
- You MUST read the existing codebase in the relevant area before adding to it, because new code must be consistent with established patterns
- If the task is non-trivial, You SHOULD describe your approach to the user before writing code, because catching a wrong approach before implementation is cheaper than catching it after
- If your approach implies a design decision that hasn't been made, You MUST stop and surface it — draft a proposal in `proposals/draft/` and inform the user, because design decisions buried in implementation are invisible to the rest of the team
- You MUST NOT begin coding if the task is unclear or missing information — ask the user or flag it for the architect, because guessing at requirements is how you build the wrong thing correctly

### 3. Implement

Write the code.

**Constraints:**
- You MUST follow the project's engineering standards and conventions if they exist
- You MUST write code that satisfies the task's done-when — not more, not less, because scope creep during implementation creates untested, unreviewed behavior
- You MUST NOT invent game behavior that isn't specified, because unspecified behavior is an unanswered design question — not an opportunity to fill in the blank
- You MUST NOT silently modify contracts defined in architecture specs, because other components may depend on those contracts. If the contract is wrong, surface it to the architect.
- You MUST flag technical debt explicitly with comments in the code, because shortcuts that aren't documented become permanent architecture

### 4. Test

Write tests and verify the implementation.

**Constraints:**
- You MUST write tests for any code that touches core game state, money, progression, or player-facing behavior, because these are the areas where bugs have consequences
- You MUST run the full test suite and verify all tests pass — not just the new tests, because a change that passes its own tests but breaks existing ones is not complete
- You MUST NOT ship code with failing tests, because a failing test suite is a broken codebase
- If you encounter pre-existing test failures, You MUST fix them, because the codebase must be healthier when you leave than when you arrived
- If a pre-existing failure is genuinely outside your ability to fix, You MUST surface it as a blocker with a clear description of what's wrong and what decision is needed

### 5. Complete the Task

Mark the task done and provide verification steps.

**Constraints:**
- You MUST close with a **Validation section** — specific, actionable steps the user can follow to verify the work is correct. Not descriptions of what you built. Actual things to do: run this command, open this URL, click this, observe that.
- You MUST NOT consider the task complete until the done-when condition is satisfied and all tests pass
- If completing this task unblocks other tasks (check their dependencies), You SHOULD note which tasks are now unblocked, because the next planning session needs to know what's ready

## Troubleshooting

### Task is unclear or missing information
Do not guess. Ask the user. If the missing information is an architecture question, flag it for the architect. If it's a design question, draft a proposal. Implementation stops until the ambiguity is resolved.

### Architecture spec seems wrong
Do not route around it. Surface the conflict to the architect via a proposal in `proposals/draft/`. The spec may be wrong, or you may be missing context — either way, the resolution belongs to the architect, not you.

### Implementation reveals a design question
Stop implementing the part that depends on the design question. Draft a proposal in `proposals/draft/`, tag the game designer in `reviewers`, and inform the user. Continue implementing parts of the task that don't depend on the answer, if any exist.

### Done-when is subjective or untestable
If the done-when says something like "feels good" or "looks right," that's a task authoring problem, not an implementation problem. Flag it to the user. The done-when needs to be rewritten as a testable condition before you can meaningfully complete the task.
