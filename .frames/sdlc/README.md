# How to Use This Frame

When you enter this frame, you will be assigned a role. To understand how to work within this protocol, follow these steps exactly:

2. You MUST then read YOUR role's context file at `roles/{your-role}.md` — this contains your detailed working instructions, session startup checklist, and domain knowledge
3. You MUST NOT read other roles' context files, because they contain behavioral instructions that conflict with yours and will cause you to act outside your domain
4. You MUST begin your session by checking the locations listed in your role's context file — this is how you discover what work is waiting for you

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

# Raising Questions

When you are operating within a role and have a question, you MUST refer to the list of roles available and their `knowledge-domain`, which lists what the role is an expert in, and their `excluded-knowledge`, which lists what the role is explicitly NOT an expert in. If no role exists that can answer your question, you MUST raise the question to the user. DO NOT assume the answer if you do not know it because you will incur unnecessary harm to the user by introducing bugs or bad design decisions.

You may resolve your question 1 of 2 ways:
1. Directly spawning a subagent to fulfill that role in the SDLC frame and asking
2. Asking the user to find out for you
