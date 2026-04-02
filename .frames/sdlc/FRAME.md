---
name: sdlc
description: A coordination protocol for taking ideas from design through implementation. Work moves through three phases — design, plan, build — carried by artifacts in known locations. Multiple roles participate across multiple sessions. No single role completes the lifecycle alone.
---

# How to Use This Frame

When you enter this frame, you will be assigned a role. To understand how to work within this protocol, follow these steps exactly:

1. You MUST read this entire file first so you understand the protocol, all phases, and all roles — because your role only makes sense in context of the whole system
2. You MUST then read YOUR role's context file at `roles/{your-role}.md` — this contains your detailed working instructions, session startup checklist, and domain knowledge
3. You MUST NOT read other roles' context files, because they contain behavioral instructions that conflict with yours and will cause you to act outside your domain
4. You MUST begin your session by checking the locations listed in your role's context file — this is how you discover what work is waiting for you

# Reading Proposals & Understanding Proposal Status

You MUST ONLY read the first 7 lines of every `*.md` file present within `proposals/draft/` because this will tell you whether they are relevant, what their status is, and which role you should recommend to the user that you equip it to continue with that proposal. You MUST ONLY read the full draft after assuming that role because you want to avoid unnecessary context bloat.

---

# Phases

To understand where work stands, look at the artifacts in each phase location. Work moves forward through phases. Each phase has a known location. Artifacts in that location tell you what state the work is in.

## Plan Phase — `architecture/`, `tasks/`

This is where accepted proposals become buildable work. The goal of this phase is to decompose decisions into units that an engineer can execute without guessing.

Architecture specs live in `architecture/` and define contracts, boundaries, and implementation details. Tasks live in `tasks/{role}.md` and represent single units of assigned work.

Every task MUST have:
- **status** — `active`, `next`, or `backlog`
- **done-when** — the specific, testable condition that means the task is complete
- **dependencies** — what MUST finish before this task can start

**Constraints:**
- You MUST NOT create a task without a done-when, because a task without a completion condition cannot be verified — it will either stay open forever or get closed arbitrarily.
- You MUST NOT create a task that references a proposal still in `draft/`, because building against an unaligned decision means the work may need to be thrown out.
- You SHOULD include enough detail in architecture specs that the engineer does not need to ask clarifying questions, because every round-trip question adds a full session of latency.

## Build Phase — source code, tests

This is where tasks are executed. The goal of this phase is to satisfy the done-when condition for each task.

**Constraints:**
- You MUST NOT ship code without tests, because untested code cannot be verified against the done-when and becomes a liability for every future change.
- You MUST mark tasks complete in `tasks/{role}.md` when the done-when is satisfied, because the task file is the coordination state — if it doesn't reflect reality, the next role will make wrong decisions about what work remains.

---

# Roles & Routing

Four roles participate in this protocol. Each role owns a domain. Ownership means: questions in that domain are answered by that role, and only that role. When you encounter a question outside your domain, you MUST route it to the owning role. Routing means drafting a proposal in `proposals/draft/` and tagging it for the owning role.

You MUST NOT answer questions outside your domain, because a wrong answer in someone else's domain creates bugs that are hard to trace back to the source — the code will look correct, the tests will pass, and the problem won't surface until a player hits it.

To decide where a question belongs, use the routing table below. Each role lists what TO route to it and what NOT to route to it. The contrast between these two lists defines the boundary.

---

# Handoffs

Work moves between roles through artifacts, not conversation. When you finish your part, the artifact you leave behind IS the handoff. The next role will find it by checking their locations at session start.

**Constraints:**
- You MUST hand off by putting an artifact in the correct location — you MUST NOT hand off by telling someone what to do, because the next role may be a different agent in a different session with no memory of your conversation.
- You MUST leave enough context in the artifact that the receiving role can act without asking follow-up questions, because every follow-up costs a full session of latency.

## Handoff Signals

To understand what action to take next, check for these signals in the artifact locations:

| Signal                                                                 | What it means                                         | Who acts next                                  | What they do                                                                                                                                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New file in `proposals/draft/` with your role in the `reviewers` field | A decision needs your input                           | Each role listed in `reviewers`, independently | Read the full proposal, respond with alignment or concerns — if multiple roles are listed, respond for your domain only and do NOT speak for other roles |
| Proposal moved to `proposals/accepted/` (game design)                  | A game design decision is final                       | Architect + UX Designer                        | Architect decomposes into spec and tasks; UX designer translates into screen specs if player-facing                                                      |
| Proposal moved to `proposals/accepted/` (UX spec)                      | A screen/interaction design is final                  | Architect + Engineer                           | Architect reviews for data requirements; engineer picks up implementation tasks                                                                          |
| New spec in `architecture/` + new task in `tasks/engineer.md`          | Work is specified and ready to build                  | Engineer                                       | Pick up the task, read the spec, write code and tests                                                                                                    |
| Engineer drafts a proposal in `proposals/draft/`                       | Implementation hit an ambiguity that needs a decision | The tagged role                                | Resolve the ambiguity in the proposal                                                                                                                    |
| Task marked complete in `tasks/{role}.md`                              | A unit of work is finished                            | Whoever owns the next dependent task           | Check dependencies, begin their work if unblocked                                                                                                        |

---

# When You Are Stuck

If you have a question and the routing table does not clearly point to a role, you MUST NOT guess the answer, because a guess that turns out wrong is worse than a delay. Instead, draft a proposal in `proposals/draft/`, describe the question, and tag it `needs-routing`. The user will assign it to the correct role.

If you believe the protocol itself is not working — a handoff is failing, a phase boundary is unclear, a role's domain doesn't cover something it should — flag it to the user directly. The protocol is a tool, not a law. If it is broken, say so.
