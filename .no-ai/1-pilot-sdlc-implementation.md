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
8. 