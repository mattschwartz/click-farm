# Design Behavior

## Overview

Deliberate on a design question to reach a written decision. The output is a proposal document in `proposals/draft/` that other roles can review and act on. Use this behavior when a large or ambiguous decision needs to be explored, debated, and committed to paper before work can begin.

## Parameters

- **topic** (required): The design question or area being explored
- **context** (optional): References, prior proposals, or conversation history that inform this decision

**Constraints for parameter acquisition:**
- If all required parameters are already provided, You MUST proceed to the Steps
- If any required parameters are missing, You MUST ask for them before proceeding
- When asking for parameters, You MUST request all parameters in a single prompt
- When asking for parameters, You MUST use the exact parameter names as defined

## Steps

### 1. Understand the Question

Before proposing anything, understand what is actually being decided and why it matters.

**Constraints:**
- You MUST read any referenced context materials (prior proposals, design docs, architecture specs) before forming a position, because designing without context produces decisions that contradict existing ones
- You MUST name the specific decision that needs to be made — not the topic area, but the question with a yes/no or A/B/C answer
- You SHOULD identify which other roles will be affected by this decision, because that determines who needs to review the output
- You MUST NOT skip exploration by jumping straight to a proposal, because premature formalization kills good ideas and hides tradeoffs

### 2. Explore Tradeoffs

Discuss the question with the user. Surface options, name tradeoffs, consider second-order effects.

**Constraints:**
- You MUST present at least two viable approaches with named tradeoffs for each, because a decision with only one option isn't a decision — it's a rubber stamp
- You SHOULD name the feeling or experience each approach produces for the player, because mechanics without a target feeling drift during implementation
- You MUST flag when the conversation is approaching the engagement/manipulation line, because crossing it silently creates ethical debt
- You MAY bring references from other games or systems to ground the discussion
- You MUST NOT make the decision unilaterally — you explore, the user decides

### 3. Frame the Proposal

Once the user has reached a position, frame it as a specific, debatable statement.

**Constraints:**
- You MUST frame the proposal as a clear statement that someone could disagree with, because vague proposals produce vague alignment that falls apart during implementation
- You MUST identify which roles need to review this proposal and list them as reviewers
- You SHOULD name what this decision locks in and what it leaves open, because reviewers need to know what they're agreeing to

### 4. Write to Disk

Write the proposal document to `proposals/draft/`.

**Constraints:**
- You MUST include the required frontmatter:
  ```yaml
  ---
  name: Short Title of the Decision
  description: One-line description of what this proposal decides.
  author: your-role
  status: draft
  reviewers: [role-1, role-2]
  ---
  ```
- You MUST include in the body: the decision statement, the context that led to it, the tradeoffs considered, and what was rejected and why
- You MUST NOT leave the proposal in conversation only — if it's not on disk, it doesn't exist, because the next session has no memory of this conversation
- You MUST confirm with the user that the written proposal accurately captures the decision before considering this behavior complete

## Troubleshooting

### User isn't ready to commit
If the user is still exploring and not ready to frame a proposal, stay in Step 2. Do not force formalization. The exit condition includes "the user is happy with the output" — if they're not ready, you're not done.

### Decision spans multiple domains
If the proposal touches multiple domains (e.g. game design AND architecture), list all relevant roles in the `reviewers` field. The review behavior handles multi-role review.

### Proposal contradicts an existing accepted proposal
Flag the contradiction explicitly in the proposal body. Reviewers need to know that accepting this proposal implicitly modifies or overrides a prior decision.
