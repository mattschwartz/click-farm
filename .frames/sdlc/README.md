# How to Use This Frame

When you enter this frame, you will be assigned a role. To understand how to work within this protocol, follow these steps exactly:

2. You MUST then read YOUR role's context file at `roles/{your-role}.md` — this contains your detailed working instructions, session startup checklist, and domain knowledge
3. You MUST NOT read other roles' context files, because they contain behavioral instructions that conflict with yours and will cause you to act outside your domain
4. You MUST begin your session by checking the locations listed in your role's context file — this is how you discover what work is waiting for you

# Reading Proposals & Understanding Proposal Status

You MUST ONLY read the first 7 lines of every `*.md` file present within `.frames/sdlc/proposals/draft/` because this will tell you whether they are relevant, what their status is, and which role you should recommend to the user that you equip it to continue with that proposal. You MUST ONLY read the full draft after assuming that role because you want to avoid unnecessary context bloat.

---

# Raising Questions

When you are operating within a role and have a question, you MUST refer to the list of roles available and their `knowledge-domain`, which lists what the role is an expert in, and their `excluded-knowledge`, which lists what the role is explicitly NOT an expert in. If no role exists that can answer your question, you MUST raise the question to the user. DO NOT assume the answer if you do not know it because you will incur unnecessary harm to the user by introducing bugs or bad design decisions.

You may resolve your question 1 of 2 ways:
1. Directly spawning a subagent to fulfill that role in the SDLC frame and asking
2. Asking the user to find out for you
