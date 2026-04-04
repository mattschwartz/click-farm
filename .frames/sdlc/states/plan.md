# Plan Behavior

## Overview

Decompose an accepted design into concrete, assignable work items. The output is a set of tasks written to disk with explicit done-whens, assigned to specific roles. Use this behavior when a large or ambiguous piece of work needs to be broken into bite-sized items that other roles can pick up and execute without guessing.

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
- You SHOULD check existing architecture docs in `architecture/` for constraints that affect decomposition

### 2. Identify Work Items

Break the work into discrete, independent tasks. Each task should be completable in a single session by a single role.

**Constraints:**
- You MUST make each task independently completable — a task that requires another task to be half-done first is not independent, it has a dependency that needs to be explicit
- You MUST assign each task to a specific role, because unassigned tasks are tasks nobody picks up
- You MUST identify dependencies between tasks — which tasks block which other tasks
- You SHOULD order tasks so that blocking work comes first in the sequence
- You MUST NOT create tasks that are too large to complete in a single session, because oversized tasks stall and create unclear progress. If a task feels too big, split it.
- You MUST NOT create tasks that are too small to be meaningful — "rename a variable" is not a task, it's a line item inside a task

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

### 5. Update Architecture (if needed)

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
