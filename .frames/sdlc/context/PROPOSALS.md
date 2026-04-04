# Proposals

This file instructs you on how to structure proposal files so that agents can better coordinate with each other to build a successful product. A proposal is a document that describes a problem and a solution and provides a space for multiple agents to work together to align on a solution together. Proposals go through several stages, starting in the `draft` state and moving to the `accepted` or `rejected` state depending on the alignment.

# Writing a proposal

Start with a conversation with the user to understand the full context of the problem and solution at hand. Ask the user questions whenever you are unsure. The proposal MUST capture the full problem statement, solution (the proposal itself), any open questions, in addition to the frontmatter that describes the state of the document.

# Reviewing a proposal

You MUST read the proposal in full before beginning a review. Start a review section at the bottom of the document to capture your thoughts and comments. Your review should use the following template:
```md
---
# Review: <ROLE_NAME>

**Date**: YYYY-MM-DD
**Decision**: Aligned/Not Aligned/Request for Comment

**Comments**

Enumerate your thoughts on the proposal and summarize your decision.
```

- If you are aligned on the proposal, remove yourself from the list of reviewers at the top of the document on the `reviewers` field.
- If you are not aligned on the proposal or have sent it back for comment, add yourself to the list of reviewers at the top of the document on the `reviewers` field if you are not already there.

# Accepting or rejecting a proposal

If you are the last reviewer and are Aligned, you MUST read the doc to understand if there are any open questions. If there are, you MUST ensure the reviewers list contains that role. Only if ALL open questions have been answered should you then move the proposal to accepted or rejected.

# Resolving Open Questions

To resolve an open question, mark the open question as [RESOLVED] inline with the question and respond to the question inline.

# Updating a proposal

When a reviewer marks a proposal as Not Aligned or Request for Comment, the author updates the proposal body to address the feedback before re-review.

- You MUST update the relevant sections of the proposal body (Problem, Proposal, References, Open Questions) in place — do NOT annotate the existing text with inline change notes
- You MUST NOT modify or remove existing review log entries, because they are a permanent record of what was reviewed and when
- If a reviewer raised a question that you are answering, add the answer as a sub-bullet under that item in the Open Questions section — do NOT respond inside the review log itself
- You MUST add a revision note directly above the first review log entry summarizing what changed, using this format:

```md
---
## Revision: YYYY-MM-DD — <author-role>

Brief summary of what changed and which review comments prompted the change.
```

The revision note tells reviewers what to re-examine without requiring them to re-read the entire document.

# Proposal Template

You MUST ALWAYS follow this template when creating, updating, or reviewing a proposal:
```md
---
name: Short Title of the Decision
description: One-line description of what this proposal decides.
author: your-role
status: draft
reviewers: [role-1, role-2]
---

# Proposal: <SHORT_TITLE>

## Problem

Concisely describe the contents of this document by summarizing the problem statement and context. You MUST ONLY provide relevant details.

## Proposal

Precisely describe the proposal based on the conversation with the user. You may use subsections as needed.

## References

List with numbers all files, URLs, diagrams, etc. that are relevant context to this proposal.

## Open Questions

List with numbers all areas of ambiguity along with an owner (either an agent or the user if no relevant agent matches). Open questions are areas of exploration for later and may influence the direction of the proposal. Answers to open questions SHOULD be added as a sub-bullet-point.
```

## Example

```md
---
name: Proposal 1
description: Description of proposal 1.
author: role-1
status: draft
reviewers: [role-2, role-3]
---

# Proposal: Proposal 1

## Problem

This is a problem that needs a solution.

## Proposal

This is how we I am proposing we address this problem.

## References

1. URL: refer to this for a reason
2. Path: refer to this for another reason

## Open Questions

1. What do we do?
  - Answer: We do this
2. What if that happens?

---
# Review: role-2

**Date**: YYYY-MM-DD
**Decision**: Request for Comment

**Comments**

I think we should do this but I have added another open question about that.
```
