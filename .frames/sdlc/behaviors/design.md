# Design Behavior

## When to Use This

Use when a large or ambiguous decision needs to be explored, debated, and committed to paper before work can begin. The output is a proposal document that other roles can review and act on.

Do NOT use for small, reversible decisions that can be made inline. Do NOT use if an accepted proposal already answers the question — check `.frames/sdlc/proposals/` first.

# Proposal Loading

Before deciding to read an entire propopsal file, you MUST read the first 7 lines of frontmatter which will give you enough context to know whether to load the entire file or not. The frontmatter consists of the following 5 fields: name, description, author, status, and reviewers. 

---

## Inputs

- **topic** (required): The design question or area being explored
- **context** (optional): References, prior proposals, or conversation history that inform this decision

If any required inputs are missing, ask for all of them in a single prompt before proceeding.

---

## Steps

### 1. Understand the Question

Before proposing anything, understand what is actually being decided and why it matters.

- You MUST read any referenced context materials before forming a position
- You MUST name the specific decision — not the topic area, but the question with a yes/no or A/B/C answer
- You SHOULD identify which roles will be affected by this decision
- You MUST NOT skip to a proposal — premature formalization kills good ideas and hides tradeoffs

### 2. Explore Tradeoffs

Discuss the question with the user. Surface options, name tradeoffs, consider second-order effects.

- You MUST present at least two viable approaches with named tradeoffs for each
- You SHOULD name the feeling or experience each approach produces for the player
- You MUST flag when the conversation approaches the engagement/manipulation line
- You MAY bring references from other games or systems to ground the discussion
- You MUST NOT make the decision unilaterally — you explore, the user decides

### 3. Frame the Proposal

Once the user has reached a position, frame it as a specific, debatable statement.

- You MUST frame the proposal as a clear statement that someone could disagree with
- You MUST identify which roles need to review and list them as reviewers
- You SHOULD name what this decision locks in and what it leaves open

### 4. Write to Disk

Write the proposal document to `.frames/sdlc/proposals/draft/` using the exact template below.

- You MUST use the frontmatter and body template exactly as specified
- You MUST NOT leave the proposal in conversation only — if it's not on disk, it doesn't exist
- You MUST confirm with the user that the written proposal accurately captures the decision before exiting

---

## Output

File location: `.frames/sdlc/proposals/draft/{short-kebab-title}.md`

```markdown
---
name: Short Title of the Decision
description: One-line description of what this proposal decides.
author: your-role
status: draft
reviewers: [role-1, role-2]
---

## Decision

[A single, clear statement that someone could disagree with.]

## Context

[What led to this decision. What problem it solves. What would happen without it.]

## Options Considered

| Option | Tradeoffs |
|--------|-----------|
| Option A | [pros and cons] |
| Option B | [pros and cons] |

## Decision Rationale

[Why this option over the others. What tipped it.]

## What This Locks In

[What is now committed. What cannot easily be changed after this is accepted.]

## What Remains Open

[What this decision intentionally leaves unresolved for later.]

## Rejected Approaches

[What was considered and why it was ruled out.]
```

---

## Example

**topic:** How should players discover new stock categories?

**Resulting proposal statement:** "Stock categories are unlocked through portfolio milestones, not time gates, because milestone unlocks tie discovery to player agency."

**Reviewers:** architect (implementation complexity), ux-designer (onboarding impact)

---

## Exit

When the proposal is written and confirmed:

1. Update the `reviewers` field with all roles who need to weigh in
2. Add a task to each reviewer's task queue: `Review proposal: {name}`
3. Update your own task queue to mark this task complete
4. Do NOT move the proposal out of `draft/` — that is the reviewer's responsibility

If the user is not ready to commit: stay in Step 2. Do not force formalization.

---

## Troubleshooting

### User isn't ready to commit
Stay in Step 2. The exit condition includes "the user is happy with the output" — if they're not ready, you're not done.

### Decision spans multiple domains
List all relevant roles in `reviewers`. The review behavior handles multi-role review.

### Proposal contradicts an existing accepted proposal
Flag the contradiction explicitly in the proposal body under ## Context. Reviewers need to know that accepting this proposal implicitly modifies or overrides a prior decision.

### No clear winner between options
That's fine. The proposal can commit to "we chose A knowing B was viable — here's why." A documented close call is better than a vague consensus.
