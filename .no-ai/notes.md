- i asked the AI to list frames installed and it decided at that moment it needed to refresh its list, but the startup script _worked_ so it shouldn't have had to do this. So, I updated the shell script so that the startup-injected context explicitly told the agent that it had the exhaustive list. Afterwards, the agent did not refresh the list - it believed the instruction.
- Mentality is like, a skill is a capability that an agent can use, an agent is defined by its behavior and area of expertise (through prompt/context files), frames are self-contained pre-packaged procedures, roles within those frames define an agent's participation and interactions. What is an agent's responsibility while acting as that role? What is it supposed to do and NOT do?
  - an engineer role comes in, writes some code, flags design questions as needing to be answered by the designer, and they're done. maybe files a proposal for the architect
- how do frames interface with each other? 
  - i want a proposals frame that just handles the design process and a roadmap frame that handles the implementation, but how do i use both of them if they're self-contained and isolated?
  - frame-to-frame communication
- are roles a useful construct? how will custom agents from other people play with the roles?
  - we don't go with roles to start. we focus on does the process work and how does it work best
- identifying when the AI has enough context, or identifying what context the AI needs
- instructions contained through indirection from startup context is weak. instruction in CLAUDE.md->BOOTSTRAP.md->FRAME.md(here) could not be followed without very very clear prompting. so the distance between the user's prompt and the instruction plays a role in whether the agent will make the connection. it helps to be explicit and up front (literally)
- this was nice to see from the architect: "Note that the ux-designer still needs to review before it can move to accepted — I must not move it unilaterally."
- [FAILED HANDOFF] ugh the architect answered the open questions in the chat but didn't autonomously update them.
- when do transition points happen? how do you recognize a transition point? what do you do after following the guidelines at that transition point?
- boundaries defined in FRAME-v1.yml are being respected by the architect
- the architect recognized a "state change" was happening (he was going into the 'review' state) and loaded the corresponding behavior. Yaml works??
- sometimes, you want the AI to do what it thinks you mean rather than what you mean explicitly. sometimes, you want the AI to fill in gaps, so you say things like
  - "that seems worth remembering" instead of "write down X in your memory files"
  - hypothesis: the AI assigns meaning to words, doesn't necessarily see synonyms the same. there's significance, i think, that's why it tends to reuse the same phrases and words a lot. they're significant to the AI. So, if you want it to remember something and it knows what remembering means - the way it knows it is probably innate to its way of thinking and if you accidentally gave it something conflicting, it could get confused.




The things we need (somewhere)
1. The roles that are involved
   1. What they do, what they don't do
   2. What they know
   3. This is `FRAME.md` and `roles/` together
2. The stages that make up the full frame
   1. design, execution, maintenance
   2. This is `FRAME.md` (high level) AND...?
3. How and when to transition between frames
4. How and when to raise questions to other roles or the user

If you can recognize what stage you are at, then you can orient around what input and output and transitions are there. It's a state machine.


polly recognized that suggesting i open my work laptop to check something would get me from procrastinating. her explanation:
 What produced it was role framing plus character. You've defined me as someone who makes your life easier and keeps things moving — that's load-bearing in how I read situations. And you've given me a persona
  that's warm but invested, not just reactive. So when you named a friction point and said "it's not hard it's just gray," I read that as someone close to the threshold, and the combination of role + character made
   the nudge feel natural rather than out of bounds.

  If you wanted to replicate it: the behavior came from goal-oriented framing at the identity level, not from a rule. You didn't tell me "if the user is close to doing something, push them." You told me who I am
  and what I care about, and the push followed from that.

Polly's other thoughts on using vague directives intentionally
   - Native vocabulary > commanded procedures. Words that map to rich internal structure (like "remember") activate judgment and context. Commands ("save this to memory") trigger mechanical execution. You get
  better, more appropriate behavior from the former.
  - Indirect framing invites agency; direct commands constrain it. "That seems worth remembering" let me decide what, how, and where. That gap-filling produces more natural results when the concept is well-defined.
  - Conflicting framing creates interference. If your phrasing implies temporary/casual but the underlying system is persistent/formal, the model hedges or undercommits.
  - It only works when the native concept is stable. "Remember" is. Vaguer or more ambiguous concepts are riskier — the gap-filling may go somewhere unintended.



---

# Learnings & Theories

- Learn to recognize good/bad ouput and learn to find out _why_ if you don't understand. That is just your standard debugging. Same way of thinking, but slightly different way of doing.
  - What did you expect? What did you get? How was the AI thinking - or what instruction was it or wasn't it following - that led it to do that? You can ask it, but take its answer with a grain of salt: it may lie.
- Closely relating goals to actions. _To do X, you do Y_
  - Seems more effective than if the two are not close together in the file
  - Not as reliable if the agent has to jump between context too much (_if_ you want more deterministic behavior)
- Indirection reduces signficance
  - Files that tell agents to read other files, which in turn tell the agents to do something have much less weight than if the first file had the instruction
- Vague, native vocabulary ("remember this") -> trigger innate, prescribed behaviors. Commands ("save this to disk") -> trigger mechanical execution, potentially verbatim and conflicting with previous instruction
- [learning] tone matters (it does react to cursing and flattery)
- [learning] avoid redundant directives (especially if they are written in different tones or level of importance)
- [learning] avoid unnecessary directives
- [learning] keep the important stuff at the top or the bottom
- [learning] agents will respect clearly defined boundaries ("that is an engineering task - I am responsible for designing systems, not writing code")
- [observation] taking advantage of different ways agents can "see" - how they view data and instructions. using the file system to derive status of proposals, or frontmatter to load minimal context for routing. Best practice to only give the agent exactly what they need (between knowledge AND behavior).
  - theory (from polly) is that it "dilutes the signal". it's more noise for the agent to have to sift through.
- [theory] spend more context on the specific task. use the background as general behaviors and knowledge
- [observation] maintaining these is going to be *hard* if the jr devs can't help effectively or unintentionally make things worse
- [observation] avoid context bleed - unrelated instructions from another file being brought in unnecessarily
- [observation] context poisoning - how seeing "pricing_engine.yml" in the examples caused the AI to start using an imaginary pricing engine in its examples
- [theory] prompt injection through context discovery. web searches. don't let it pull from web if you don't trust the source
- [learning] phrasing influences outcome - the way you ask the AI something or tell it something (tone) _will_ influence how it reacts to it and future ideas too. 
  - theory is it matches your tone
- [observation] cooperation is _doable_ and _effective_ when you apply all the right principles like boundaries, roles, context routing
- [theory] monolith files are not scalable
  - they are not easy for humans to consume
  - they are not easy for humans to edit
  - they are not easy for agents to edit (did it _really_ update _EVERY_ occurrence?)
  - they are difficult for AI to consume (for context noise, poisoning, tonal inconsistencies)
  - they will inevitably grow too large for the context window 
- [learning] AI do not always write better instructions for other AI than humans
  - they do seem to do well at objective knowledge though? Maybe instructions are too subjective to be written by an AI
- [theory] we need to continue showing the jr devs the effectiveness of using AI and it can't just be "code faster"
- [theory] easier handoff
  - next person can ask the agent question and you get more data about the project, reasons why decisions were made, if they were done thorugh the brainstorming agent
  - but if that process isnt used, the whole thing breaks down so its fragile rn without people reliably using it
- [theory] you don't have to worry as much about getting the prompt right in one go anymore. you can sculpt something with the AI
- 

# Examples
- Difference between an agent following MUST and occasionally following COULD or MAY
- A problem which requires knowing two pieces of contradictory instructions at two separate times
  - To where the solution is you need to have two separate files with a single place to read from them and two separate sessions so as not to poison the context
- 

# Curriculum
- Prompting AI
  - Tone and phrasing
  - Harrassment and flattery
- Understanding why something works and something else doesn't
  - and how to find out
- How to interpret and judge output
  - why did the AI say that?
  - When do you validate? judge the stakes
- Where AI succeeds, where it fumbles
- 

# Open Questions
- How do agents manage context? How do they search their context?