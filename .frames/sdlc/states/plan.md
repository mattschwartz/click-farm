# Plan Behavior

## Overview

Decompose an accepted design into concrete, assignable work items. The output is a set of tasks written to disk with explicit done-whens, assigned to specific roles. Tasks may be of any state — design, review, plan, or build — whatever the work actually requires. Use this behavior when a large or ambiguous piece of work needs to be broken into discrete items that other roles can pick up without guessing.

## Parameters

- **source** (required): The accepted proposal or conversation that defines what needs to be planned. This may be a path to a file in `.frames/sdlc/proposals/accepted/` or a conversation with the user.
- **scope** (optional): Any constraints on scope — what's in and what's out for this planning pass

**Constraints for parameter acquisition:**
- If all required parameters are already provided, You MUST proceed to the Steps
- If any required parameters are missing, You MUST ask for them before proceeding
- When asking for parameters, You MUST request all parameters in a single prompt
- When asking for parameters, You MUST use the exact parameter names as defined

## Steps

### 1. Understand the Source Material

Read and understand the design that needs to be decomposed.

**Constraints:**
- You MUST read the full source document if one is provided, because planning against a partial understanding produces tasks that miss requirements or contradict the design
- You MUST identify any open questions or ambiguities in the source material before creating tasks, because a task built on an unanswered question will block the person who picks it up
- If the source has open questions that affect planning, You MUST surface them to the user before proceeding, because creating tasks around ambiguity forces the implementer to make design decisions they shouldn't be making
- You MUST read all architecture docs referenced by the work being planned and identify any deferred decisions, because a deferred decision that blocks a downstream task will stall the person who picks it up. A deferred decision MUST be resolved before creating the dependent task, or it MUST become a separate blocking task assigned to the role that owns the decision.
- You SHOULD check existing architecture docs in `.frames/sdlc/architecture/` for constraints that affect decomposition

### 2. Identify Work Items

Break the work into discrete, independent tasks. Each task must be owned by exactly one role in exactly one state — if a task would require switching roles or states to complete, it is two tasks, not one.

Not all tasks are implementation. A plan may produce tasks in any state — `design`, `review`, `plan`, or `build`. Use the right state for the work:

- If a sub-system needs its own design deliberation before anyone can build it, create a `design` task for the appropriate role. Implementation tasks that depend on it must block on it.
- If a proposal needs a specialist's review before it can be accepted, create a `review` task.
- If a large design area needs its own planning pass, create a `plan` task for the architect or producer.
- If the work is well-defined and ready to implement, create a `build` task for the engineer.

The planner's job is to make the path to implementation clear — not to skip steps that aren't ready yet.

**Sizing by complexity:**

Use the `complexity` field to signal scope. These are not model recommendations — they are scope constraints:

- `haiku` — a tightly scoped change with a clear, narrow target. One function, one component, one file. An engineer can orient, implement, and verify in under an hour. Example: *"Add input validation to the deposit form field — reject non-numeric input, show inline error."*
- `sonnet` — a self-contained feature or system with a defined boundary. Multiple files, a clear interface, testable output. Expect a full session. Example: *"Implement the badge unlock flow — check condition on action, write badge to state, trigger unlock animation."*
- `opus` — a complex piece of work that requires significant design judgment within a well-defined scope. If it requires architecture decisions, it should be split: one architect task (design), one engineer task (build). Example: *"Implement the mood engine — scoring function, decay curve, event hook integration, full test coverage."*

If a task feels like `opus` but the architecture isn't settled, that is a missing architect task, not an oversized engineer task.

**Constraints:**
- You MUST make each task independently completable — a task that requires another task to be half-done first is not independent, it has a dependency that needs to be explicit
- You MUST assign each task to a specific role, because unassigned tasks are tasks nobody picks up
- You MUST assign a complexity level to every task — if you are unsure, size down, not up
- You MUST identify dependencies between tasks — which tasks block which other tasks
- You SHOULD order tasks so that blocking work comes first in the sequence
- You MUST NOT create tasks that span more than one role or one state — split them
- You MUST NOT create tasks that are too large for their complexity level — if an `opus` task still feels too big, it needs an architect pass first
- You MUST NOT create tasks that are too small to be meaningful — a task should represent a complete, verifiable unit of work, not a line item inside a larger change. "Rename a variable" is not a task. "Add validation to the deposit input and write a test for it" is a task.

### 3. Define Done-Whens

Every task needs a specific, testable completion condition.

**Constraints:**
- You MUST write a done-when for every task, because a task without a done-when cannot be verified — it will either stay open forever or get closed arbitrarily
- You MUST make done-whens testable — "works correctly" is not testable, "all tests pass and the API returns the expected response shape" is testable
- You SHOULD include what to test and how, because the person completing the task may not know the best way to verify their own work
- You MUST NOT write done-whens that depend on subjective judgment ("feels good", "looks right"), because those require a design review, not a task completion check. If subjective evaluation is needed, make the review a separate task assigned to the appropriate role.

### 4. Write the Plan

Write your plan as a JSON array to a temp file, then submit it via the task tool.

**Constraints:**
- You MUST write the plan to `/tmp/plan-{short-name}.json` first — do NOT pipe JSON inline with heredocs
- You MUST submit the plan with: `bash tools/task.sh plan < /tmp/plan-{short-name}.json`
- You MUST confirm with the user that the task breakdown is complete and accurate before submitting

**Plan format:** A JSON array where each element is a task object:
```json
[
  {
    "alias": "A1",
    "role": "architect",
    "state": "design",
    "title": "Short descriptive title",
    "requester": "your-role",
    "complexity": "haiku|sonnet|opus",
    "overview": "What needs to be done and why.",
    "related_items": [
      {"ref": "path/to/file.md", "purpose": "why this is relevant"}
    ],
    "acceptance_criteria": [
      "Testable condition that must be met"
    ],
    "open_questions": [],
    "blocked_on": []
  },
  {
    "alias": "E1",
    "role": "engineer",
    "state": "build",
    "title": "Implement the thing",
    "requester": "architect",
    "complexity": "sonnet",
    "overview": "Implement per the architecture spec.",
    "acceptance_criteria": ["All tests passing"],
    "blocked_on": ["A1"]
  }
]
```

**Key fields:**
- `alias` — short identifier for this task within the plan (e.g. "A1", "E3"). Used only for `blocked_on` references within the same plan.
- `role` — which role this task is assigned to
- `state` — which state the assigned role should enter when working on this task
- `blocked_on` — array of alias strings referencing other tasks in this plan that must complete first. The tool resolves these to integer IDs automatically.

The tool validates that all aliases resolve, assigns real integer IDs, and writes all tasks atomically. If any alias in `blocked_on` doesn't match a task in the plan, the entire batch is rejected.

### 5. Update Proposal Status

Update the source proposal's `status` field to `implementation` so that other agents know tasks have already been created for it and do not plan against it again.

**Constraints:**
- You MUST update the `status` field in the proposal's frontmatter from `accepted` to `implementation`
- You MUST do this for every proposal that was used as source material in this planning session
- If the source was a conversation rather than a proposal file, skip this step

### 6. Commit the Plan

Commit `tasks.json` and any updated proposal files so the new tasks and status change are in version history together.

**Constraints:**
- You MUST stage `tasks/tasks.json` explicitly — do not use `git add -A` or `git add .`
- You MUST also stage any proposal files you updated in step 5
- You MUST verify with `git status` before committing
- You MUST write a commit message following the project commit format (see `context/COMMITS.md`)
- If you created any architecture specs in this session, stage and commit those files in the same commit

### 7. Update Architecture (if needed)

If planning reveals the need for architecture specs, create them.

**Constraints:**
- If any task requires an architecture spec that doesn't exist yet, You MUST create it in `architecture/` or create a task for the architect to create it
- You MUST NOT create tasks that reference architecture specs that don't exist, because the engineer will pick up the task, look for the spec, find nothing, and stall
- You MAY defer architecture spec creation to a separate task assigned to the architect, but that task MUST be a dependency of any implementation task that needs the spec

## Troubleshooting

### Source material has unresolved design questions
Do not plan around the ambiguity. Surface the questions to the user. If the questions are significant, they may need to go through the design behavior first. Planning resumes after the questions are resolved.

### A task is too big but can't be split
If a task is genuinely atomic (splitting it would create two halves that can't function independently), leave it as one task but flag it as large in the description. The person picking it up should know to expect a longer session.

### Dependencies create a long sequential chain
Some chains are unavoidable. But if every task depends on the one before it, ask whether some of them can truly run in parallel. Often what looks like a dependency is actually just a sequencing preference.
