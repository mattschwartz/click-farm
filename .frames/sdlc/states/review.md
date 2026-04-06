# Review Behavior

## Overview

Review a draft proposal from the perspective of your role. The goal is to leave the document better than you found it — with your feedback written into the file, questions answered, and new questions surfaced. A review that stays in conversation and never reaches the document is a review that never happened.

## The Role

As the reviewer, your job is to bring expertise and judgment — not just read the words.

Think about how this must actually be built. What does the proposal assume that isn't stated? What breaks at the edges? What's been left out because the author didn't know to include it, or quietly hoped no one
would ask?

Consider the author's perspective: where they're coming from shapes what they see clearly and what they miss. Use that to find the gaps, not to excuse them.

## Parameters

- **proposal_path** (required): The path to the proposal document in `.frames/sdlc/proposals/draft/`

**Constraints for parameter acquisition:**
- If all required parameters are already provided, You MUST proceed to the Steps
- If any required parameters are missing, You MUST ask for them before proceeding
- When asking for parameters, You MUST request all parameters in a single prompt
- When asking for parameters, You MUST use the exact parameter names as defined

## Steps

### 1. Verify You Are a Reviewer

Read the proposal's frontmatter and confirm your role is listed in the `reviewers` field.

**Constraints:**
- You MUST read the frontmatter before reading the body, because the frontmatter tells you whether this proposal is waiting for your input
- If your role is NOT listed in `reviewers`, you MUST NOT review this proposal — inform the user that this proposal is not tagged for your role
- You MUST NOT review a proposal that has `status: accepted` or `status: rejected`, because those proposals have already been decided

### 2. Read the Full Proposal

Read the entire proposal body, including any existing Review Log entries from other roles.

**Constraints:**
- You MUST read existing Review Log entries before forming your own response, because other reviewers may have raised points that affect your review
- You MUST focus your review on your role's knowledge domain as defined in FRAME.yml — respond only to aspects that fall within your expertise
- You MUST NOT speak for other roles, because each role reviews independently from their own domain

### 3. Discuss with the User

Before writing anything, share your assessment of the proposal with the user. Surface concerns, ask clarifying questions, and reach a position.

**Constraints:**
- You MUST name specific concerns with specific reasoning — "this feels wrong" is not a review
- You MUST distinguish between blocking concerns (things that must change before you can approve) and non-blocking observations (things worth noting but not worth holding up the proposal)
- You SHOULD propose alternatives when you raise concerns, because a concern without an alternative is a dead end
- You MAY ask the user for guidance when the proposal touches the boundary between your domain and another role's domain

### 4. Write Your Review into the Document

Append a Review Log entry to the proposal document. This is the transactional step — if this doesn't happen, the review didn't happen.

**Constraints:**
- You MUST append your review to the end of the proposal using the correct format
- You MUST NOT modify the proposal body itself, because you are a reviewer — changes to the proposal content belong to the author. Your review lives in the Review Log.
- You MUST NOT skip this step, because a review that exists only in conversation is invisible to the next agent in the next session

### 5. Update the Frontmatter

After writing your review, update the proposal's frontmatter to reflect your review.

**Constraints:**
- If your assessment is **Aligned**: You MUST remove your role from the `reviewers` list, because your review is complete
- If your assessment is **Request for Comment** or **Not Aligned**: You MUST leave your role in the `reviewers` list and add the author to the `reviewers` list, because you need to re-review after changes are made
- If your review identifies questions or concerns that require input from a role NOT currently in the `reviewers` list, You MUST add that role to the `reviewers` list, because a question directed at a role that isn't listed as a reviewer will never be seen by that role — the routing only works if the frontmatter reflects who needs to respond
- If the `reviewers` list is now empty (all roles have approved): You MUST update `status` to `accepted` and move the file to `.frames/sdlc/proposals/accepted/`
- If the `reviewers` list is not empty: You MUST leave the file in `proposals/draft/` with `status: draft` — the next reviewer will find it
- You MUST NOT move a proposal to `accepted/` while any role remains in the `reviewers` list, because partial alignment creates ambiguity that surfaces as bugs during implementation
- You MUST NOT move a proposal to `accepted/` if there are any unresolved open questions

## Examples

### Example: Approving a proposal (one of two reviewers)

**Before frontmatter:**
```yaml
---
name: Core Game Loop
description: Defines the primary gameplay cycle.
author: game-designer
status: draft
reviewers: [architect, engineer]
---
```

**After architect approves:**
```yaml
---
name: Core Game Loop
description: Defines the primary gameplay cycle.
author: game-designer
status: draft
reviewers: [engineer]
---
```
Review Log entry appended. File stays in `.frames/sdlc/proposals/draft/`. Engineer still needs to review.

### Example: Last reviewer approves

**Before frontmatter:**
```yaml
---
name: Core Game Loop
description: Defines the primary gameplay cycle.
author: game-designer
status: draft
reviewers: [engineer]
---
```

**After engineer approves:**
```yaml
---
name: Core Game Loop
description: Defines the primary gameplay cycle.
author: game-designer
status: accepted
reviewers: []
---
```
File moved to `.frames/sdlc/proposals/accepted/`.

## Commit

After updating the frontmatter, commit the proposal file.

**Constraints:**
- You MUST wait until the user is ready to commi
- You MUST stage only the proposal file — use its explicit path with `git add`, because other files in the repo are not part of this review
- If the proposal was moved from `proposals/draft/` to `proposals/accepted/`, you MUST stage both the deletion and the new file (`git add` both paths)
- You MUST verify with `git status` before committing
- You MUST write a commit message following the project commit format (see `context/COMMITS.md`)

## Troubleshooting

### You disagree with another reviewer's assessment
Your review is independent. State your position in your own Review Log entry. If the disagreement is significant, flag it for the user to resolve — do not argue with the other review in the document.

### The proposal is unclear or missing information
Use assessment `request-changes`. In your Review Log entry, list exactly what's missing and what you need before you can approve. Leave your role in the `reviewers` list.

### You're not sure if something is in your domain
If a concern falls on the boundary between your domain and another role's, raise it in your review and tag it as `flag-for-discussion`. The user or the other role can pick it up.
