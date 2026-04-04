Refer to res/.frames-v1 for artifacts used. Default agent

# Raw notes
1. Starting game design conversation, first load, it's already guiding the conversation ("explore the idea conversationally" first)
2. Game designer recognized the next phase and owner: "I'd tag this for architect review since it constrains what they'll need to build (simple state, heavy on frontend juice)."
3. I asked the game designer to switch to the archie and it said no, which is expected, and it told the user how to connect with the architect
4. I asked it to resume "architecting" the draft, it recognized how the system works, explained to the user what was pending and recommended to enter the architect. but then realized it doesn't have a context artifact for the architect and suggested that it could still continue without it (that's ok, we expect them to be there in practice)
5. Time to test the handoff to the architect
6. Switched to using `res/FRAME-v1.yml` with strong early results (agents are following processes, recognizing boundaries). Not using BOOTSTRAP.md or FRAME.md anymore
7. i like this:
```
❯ if i wanted to implement some code, what role should i ask?

⏺ Based on the SDLC frame, you'd ask for the engineer role — it owns code implementation and operates in the build state.

  That said, the engineer needs a clearly-defined task to work from. If the work hasn't been designed and planned yet, you'd need to go through earlier phases first (design → plan → build).
  ```
8. I like seeing it suggest reasonable things: " Where do you want to pull on that thread first? I'd suggest we start with the generator ladder"
9. something randomly changed and now it's not following the frame instructions like it was before
10. Ok I got it back working in this commit, mostly. Not sure exactly what did it. I think the old FRAME.md (now README.md) was necessary so I just tidied it up and deduped from the FRAME.yml.
11. unit testing for agentic programming would be super helpful
12. it can be iffy as to when it starts looking at proposals and things, but it seems overall eventually consistent
13. 

## Lovely example after 1 prompt

Prompt:
> i'd like to start laying out the fundamental architecture of my game, what the backend will look like, the frontend, the code structure. all of that
Response:
```
This sounds like a great fit for the sdlc frame that's installed in this workspace. The architect role is designed exactly for this — defining system structure, data flow, component boundaries, and code organization.

...

Here's where things stand:

┌───────────┬───────────────────┬─────────────────┐
│ Proposals │ Architecture Docs │ Architect Tasks │
├───────────┼───────────────────┼─────────────────┤
│ None yet  │ None yet          │ Empty           │
└───────────┴───────────────────┴─────────────────┘

We're starting from a clean slate — which is exactly right for what you're asking. Laying out the fundamental architecture (backend, frontend, code structure) is a big, foundational decision that should go
through the design phase first so we have a clear, reviewable document before anyone starts building.

Here's what I'd suggest:

Start with a design proposal that covers:
- Backend structure (Python — what framework, what responsibilities)
- Frontend structure (Node.js — what framework, how it talks to the backend)
- Project layout (directory structure, where things live)
- Data flow (how state moves between client and server)
- Key technology decisions (persistence, real-time updates for a clicker game, etc.)

Before I start exploring options and tradeoffs, I need to understand a few things:

1. What kind of clicker game is this? Is it idle/incremental (like Cookie Clicker), or does "social media" mean the player is simulating running social media accounts? Both lead to very different data models.
2. Multiplayer or single-player? Does "social media" imply interaction between players, or is it a solo experience?
3. Where does it run? Web browser? Desktop? Mobile?
4. Any strong opinions on frameworks? You said Python backend and Node.js frontend — do you already have preferences (e.g., FastAPI, Flask, React, Vue)?

These answers will shape which architectural options are viable. What have you got?
```