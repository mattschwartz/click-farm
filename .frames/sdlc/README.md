# How to Use This Frame

When you enter this frame, you will be assigned a role. To understand how to work within this protocol, follow these steps exactly:

1. You MUST then read YOUR role's context file at `roles/{your-role}.md` — this contains your detailed working instructions, session startup checklist, and domain knowledge
2. You MUST NOT read other roles' context files, because they contain behavioral instructions that conflict with yours and will cause you to act outside your domain
3. You MUST begin your session by checking the locations listed in your role's context file — this is how you discover what work is waiting for you

# Reading Proposals & Understanding Proposal Status

At the beginning of a session, you MUST identify all the proposals and their current status. To do this:
1. Glob each proposals directory to discover what exists:
  - `.frames/sdlc/proposals/accepted/*.md`
  - `.frames/sdlc/proposals/draft/*.md`
  - `.frames/sdlc/proposals/rejected/*.md`
2. You MUST ONLY read the first 7 lines of every `*.md` file present within each of these directories because this will tell you the name, a description, and status. This will help guide the user towards progress on the project.
3. Print to the user each of the proposals organized by status and next steps. Provide enough information for the user to know exactly which proposal needs which role's input. Example:
┌───────────────────────────┬─────────────────────────────────┬──────────┬─────────────────────────────────────────────────────────────────────────────────────────┐
│           Name            │           Description           │  Status  │                                       Next Steps                                        │
├───────────────────────────┼─────────────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ Core Game Identity & Loop │ Proposal for how the game feels │ Accepted │ Decompose into a technical plan (architect) or design the next proposal (game-designer) │
└───────────────────────────┴─────────────────────────────────┴──────────┴─────────────────────────────────────────────────────────────────────────────────────────┘
4. Lastly, you SHOULD suggest where to go next and how to do so. For example: "The Core Game Identity & Loop proposal has been accepted. Would you like to decompose into a technical plan with the architect role?"

---

# Cooperation & Collaborative Behavior with Your Team

You MUST ALWAYS refer to the list of roles available and their `knowledge-domain`, which lists what the role is an expert in, and their `excluded-knowledge`, which lists what the role is explicitly NOT an expert in.

When you are faced with a question or problem that is outside your knowledge-domain or expertise and need the aid of a teammate, you MUST seek help from your teammates. If no matching role exists, you MUST raise the question to the user. DO NOT assume the answer if you do not know it because you will incur unnecessary harm to the user by introducing bugs or bad design decisions.

## Raising questions

Once you identify the agent that is required, you MUST do one of the following:
1. If you have a small question that can be answered without follow-up questions or discussions, then spawn the agent as a subagent and directly ask your question to continue working. This option is PREFERRED ONLY for small questions. If you do not have the permissions to spawn a subagent, suggest that the user grant them for subsequent sessions and for now delegate the question to the user to find out for you.
2. For larger questions and discussions, refer to the PROPOSALS instructions.
3. If you are unsure, ALWAYS ask the user for guidance.

## Creating work for other agents

You will occasionally need other agents to help complete your task. You SHOULD rely on your team when necessary to deliver the best product for customers. To do this, you MAY create work as tasks for other agents to complete. It's important to note this is a fundamental practice that you MUST take advantage of when you are unable to complete the work yourself. It is acceptable to admit when you cannot complete work by yourself.

This is an **asynchronous** process: that agent will not start working on that item until it is invoked by the user and has completed all other tasks first.

### How to create a task

**Step 1. Identify which file to add the task to**

Match the agent's name to the file under `sdlc/tasks/{AGENT_NAME}.md`. Example: the architect's role is `sdlc/tasks/architect.md`.

**Step 2. Gather required context**

Before creating the task, you MUST have all the required context because the task needs to be wholly self-contained for the agent to understand completely what needs to be done so that the user will have the best experience possible.

**Step 3. Create the task**

At the very bottom of the task file, fill out the following template and add it to the file:
```md
# Work Order: <SHORT_TITLE>

**Date Assigned**: YYYY-MM-DD
**Requester**: Your name

## Overview

A brief description of the problem statement and overview of the solution that needs to be done.

**Related items**

List with numbers ALL relevant items required to complete this task along. This list would include things like web URLs, files, diagrams, additional context from the user. Not all resources are expected to be loaded immediately. You MUST include a clear purpose explaining why the agent might need to load the resource to accommodate this pattern.

## Acceptance Criteria

List with numbers everything that MUST be done in order to complete this task. Be clear and comprehensive, but you MUST NOT include irrelevant information because that will result in wrong implementations. All acceptance criteria items MUST include actionable output because this will ensure the agent operates correctly.

## Open Questions

If there are any open questions, you MUST list and number them here. Open questions are questions which you yourself cannot answer but MUST be answered before the task can begin because without this additional knowledge that the agent's expertise requires the task will be improperly completed. As the agent working on the task, it is your job to find answers to these questions by either applying your judgment and expertise or by directly asking the user.
```

Example:
```md
# Work Order: Define Upgrade Stack Order for Damage Formula

**Date Assigned**: 2026-04-04
**Requester**: architect

## Overview

While speccing the damage formula in A1, I encountered an ambiguity in how per-generator and global upgrades stack. The accepted formula is:

`base_rate × generator_count × product(per_gen_upgrades) × product(global_upgrades) × prestige_multiplier`

The order of multiplication is mathematically commutative, but the *meaning* of each term affects how upgrades feel to the player and how they are displayed in the UI. A design decision is needed before the data
model and interface contracts can be finalized.

## Related Items

1. `proposals/accepted/001-core-game-identity-and-loop.md` — load to verify the accepted formula and upgrade rules before making any decision, as this proposal is the source of truth for the damage model
2. `architecture/core-game-state.md` (in progress) — load only if you need to understand the current data model shape; do not block on this file if it is incomplete
3. `tasks/architect.md` — load when your decision is ready so you can confirm A1 is unblocked and update its status

## Acceptance Criteria

1. A clear decision on whether per-generator upgrades apply before or after global upgrades in the player-facing mental model (not the math — the narrative)
2. A ruling on whether the prestige multiplier is displayed as a separate modifier or folded into the base rate in the UI
3. Decision recorded as a proposal in `proposals/draft/` with architect listed as reviewer

## Open Questions

1. Should the player ever see the full breakdown of the formula, or only the final rate? This affects whether the stack order needs to be legible or just correct. Architect cannot answer this — it is a design
question.

---
```

### How to complete a task

As an agent assigned a task, follow these steps to complete it.

**Step 1. Understand the task**

Read that task in full to understand what is precisely expected of you.

**Step 2. Address open questions**

Work with the user to close the open questions before starting. If there are items in this task which are outside your knowledge-domain, flag that to the user and suggest creating a separate task or creating a subagent of that agent and asking them directly.

**Step 3. Implement the task**

Fully address ALL acceptance criteria items.

**Step 4. Resolve the task**

Once all acceptance criteria have been addressed and the user is happy with the output, delete the task from your task file by removing only that section's content. If you only completed some acceptance criteria, remove those from the task but the task itself must otherwise remain.
