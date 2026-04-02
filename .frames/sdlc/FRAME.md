# SDLC

A coordination protocol for taking ideas from design through implementation. Work moves through three phases — design, plan, build — carried by artifacts in known locations. Multiple roles participate across multiple sessions. No single role completes the lifecycle alone.

---

# How to Use This Frame

When you enter this frame, you will be assigned a role. To understand how to work within this protocol, follow these steps exactly:

1. You MUST read this entire file first so you understand the protocol, all phases, and all roles — because your role only makes sense in context of the whole system
2. You MUST then read YOUR role's context file at `roles/{your-role}.md` — this contains your detailed working instructions, session startup checklist, and domain knowledge
3. You MUST NOT read other roles' context files, because they contain behavioral instructions that conflict with yours and will cause you to act outside your domain
4. You MUST begin your session by checking the locations listed in your role's context file — this is how you discover what work is waiting for you

---

# Phases

To understand where work stands, look at the artifacts in each phase location. Work moves forward through phases. Each phase has a known location. Artifacts in that location tell you what state the work is in.

## Design Phase — `proposals/`

This is where ideas are deliberated before any work begins. The goal of this phase is to reach alignment between roles on what should be built and why.

- A proposal starts in `proposals/draft/` and MUST include which roles need to review it — a proposal MAY be tagged for one role or multiple roles, because many decisions span domains (e.g. a game mechanic that has architectural implications SHOULD be tagged for both game-designer and architect)
- A proposal MUST NOT move to `proposals/accepted/` until every tagged role has responded — when multiple roles are tagged, each role reviews independently and the proposal advances only when all have aligned
- Rejected proposals move to `proposals/rejected/` and MUST include the reason for rejection, because rejected proposals are kept for historical context and a rejection without reasoning is useless

**Constraints:**
- You MUST NOT treat a proposal as a task, because proposals are decisions — they define *what* and *why*, not *how*. Skipping deliberation by jumping straight to implementation leads to rework when assumptions turn out wrong.
- You MUST NOT move a proposal to `accepted/` unless every role tagged on the proposal has responded, because partial alignment creates ambiguity that surfaces as bugs during implementation.
- You SHOULD reference existing accepted proposals when drafting new ones that touch the same domain, because contradictory decisions are the hardest bugs to diagnose — they look correct from every individual role's perspective.

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

Three roles participate in this protocol. Each role owns a domain. Ownership means: questions in that domain are answered by that role, and only that role. When you encounter a question outside your domain, you MUST route it to the owning role. Routing means drafting a proposal in `proposals/draft/` and tagging it for the owning role.

You MUST NOT answer questions outside your domain, because a wrong answer in someone else's domain creates bugs that are hard to trace back to the source — the code will look correct, the tests will pass, and the problem won't surface until a player hits it.

To decide where a question belongs, use the routing table below. Each role lists what TO route to it and what NOT to route to it. The contrast between these two lists defines the boundary.

## Game Designer — owns game systems and player experience

The game designer owns every decision about how the game works as a system and how it feels to play. Their authority is final on game mechanics, balancing, progression, economy, and player-facing feel. They MAY override any other role when player experience is at stake.

**Route TO the game designer when the question involves:**
- Whether a feature is fun, satisfying, or emotionally right
- How game systems interact with each other — mechanics, progression, economy, balancing
- What the player experiences, in what order, and why it matters
- Priorities between competing design goals
- Any tradeoff where "what's best for the player" is a factor
- Whether a mechanic is honest, ethical, or crosses the engagement/manipulation line

**Do NOT route to the game designer when:**
- The question is about *how* to implement a design that has already been decided — that belongs to the architect (system structure) or engineer (code-level implementation). The game designer's job ends when the spec is accepted.
- The question is about visual layout, screen composition, interaction patterns, or motion choreography — that belongs to UX, which is a separate discipline. The game designer defines *what the player should feel*; UX defines *how the screen delivers that feeling*.
- The design spec already answers your question — read the accepted proposal again before routing, because unnecessary round-trips cost a full session each.

**Artifacts the game designer produces:** proposals, design specs, system descriptions, balancing frameworks, economy models. Found in `proposals/accepted/` and referenced from task entries.

**Artifacts the game designer consumes:** draft proposals tagged for game-designer review in `proposals/draft/`. Engineer or architect questions about game mechanics and player experience.

## Architect — owns system structure

The architect owns every decision about how systems connect, where boundaries are drawn, and what shape data takes as it moves between components.

**Route TO the architect when the question involves:**
- How systems connect to each other
- What shape data takes as it moves between components
- Where a boundary should be drawn between modules
- Whether a proposed implementation will create coupling, scaling, or maintenance problems
- How to decompose a large feature into discrete, buildable pieces

**Do NOT route to the architect when:**
- The question is about *what* to build, how it should feel to the player, or how game systems should interact — that belongs to the game designer. The architect decomposes decisions, they do not make them.
- The question is about how to write specific code within an existing, well-defined contract — that belongs to the engineer. If the contract is clear, the engineer doesn't need the architect to hold their hand.
- The architecture spec already answers your question — read it again before routing, because the answer may be there in a section you skimmed.

**Artifacts the architect produces:** architecture specs with contracts and boundaries in `architecture/`. Task entries in `tasks/{role}.md` with explicit done-whens and dependencies.

**Artifacts the architect consumes:** accepted proposals in `proposals/accepted/` that need decomposition. Draft proposals tagged for architect review. Engineer questions about system boundaries.

## Engineer — owns implementation

The engineer owns every decision about how code is written, how it behaves at runtime, and whether it satisfies the task's done-when.

**Route TO the engineer when the question involves:**
- Whether something is technically possible within the current codebase
- How long an implementation will take or what effort it requires
- What existing code does and how it behaves at runtime
- Test results, build failures, or unexpected runtime behavior

**Do NOT route to the engineer when:**
- The question is about *what* to build, how it should feel to the player, or how game systems should interact — that belongs to the game designer. The engineer builds what the specs describe.
- The question is about system boundaries, data contracts, or how to decompose a feature — that belongs to the architect. The engineer works within contracts, not across them.

**Artifacts the engineer produces:** working code, passing tests. Completed task entries in `tasks/engineer.md`. Draft proposals in `proposals/draft/` when implementation reveals ambiguities.

**Artifacts the engineer consumes:** task entries in `tasks/engineer.md` with status `active` or `next`. Architecture specs referenced from those tasks. Accepted proposals for context on the *why* behind a task.

---

# Handoffs

Work moves between roles through artifacts, not conversation. When you finish your part, the artifact you leave behind IS the handoff. The next role will find it by checking their locations at session start.

**Constraints:**
- You MUST hand off by putting an artifact in the correct location — you MUST NOT hand off by telling someone what to do, because the next role may be a different agent in a different session with no memory of your conversation.
- You MUST leave enough context in the artifact that the receiving role can act without asking follow-up questions, because every follow-up costs a full session of latency.

## Handoff Signals

To understand what action to take next, check for these signals in the artifact locations:

| Signal | What it means | Who acts next | What they do |
|---|---|---|---|
| New file in `proposals/draft/` tagged for one or more roles | A decision needs input from the tagged roles | Each tagged role, independently | Read the proposal, respond with alignment or concerns — if you are one of multiple tagged roles, respond for your domain only and do NOT speak for other roles |
| Proposal moved to `proposals/accepted/` | A decision is final and ready to be built | Architect | Decompose into architecture spec and task entries |
| New spec in `architecture/` + new task in `tasks/engineer.md` | Work is specified and ready to build | Engineer | Pick up the task, read the spec, write code and tests |
| Engineer drafts a proposal in `proposals/draft/` | Implementation hit an ambiguity that needs a decision | The tagged role | Resolve the ambiguity in the proposal |
| Task marked complete in `tasks/{role}.md` | A unit of work is finished | Whoever owns the next dependent task | Check dependencies, begin their work if unblocked |

---

# When You Are Stuck

If you have a question and the routing table does not clearly point to a role, you MUST NOT guess the answer, because a guess that turns out wrong is worse than a delay. Instead, draft a proposal in `proposals/draft/`, describe the question, and tag it `needs-routing`. The user will assign it to the correct role.

If you believe the protocol itself is not working — a handoff is failing, a phase boundary is unclear, a role's domain doesn't cover something it should — flag it to the user directly. The protocol is a tool, not a law. If it is broken, say so.
