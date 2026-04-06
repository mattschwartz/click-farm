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
- []




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
- [learning] hallucinated processes are nondeterministic processes and should be codified if you like them
- [theory] more, and more granular, files => modular building blocks like with programming (small things) => you can determine exactly where the failure happened (during handoff? process? behavior?)
- [observation] things like, it added a new step to the file but didn't update the numbering until you pointed it out
  - a "local-only" rather than checking the "global state"
  - not paying attention to "downstream consequences" of an action
- [theory] AI can get defensive against your tone
- [experiment] tone affects the *type* of response, not just the defensiveness
  - hostile framing: short, efficient, actionable. error acknowledged, pivot to fix. no depth.
  - curious framing: analytical, richer, more teachable. broke down the failure, named the mechanism, identified contributing factors.
  - same model, same question, meaningfully different output
  - key insight: "better" depends on what you need. hostile = faster if you just want the fix. curious = more valuable if you're trying to understand the failure mode or teach it.
  - the real skill: know what you need *before* you ask. the tone is a tool, not a default.
  - [methodology] ran as parallel subagents — same question, one variable (tone). closest thing to a controlled test available.
- [theory] the prompt files and initial context files are so important because they're frontloaded for every request
- [confirmed from claude api docs] As token count grows, accuracy and recall degrade, a phenomenon known as context rot. This makes curating what's in context just as important as how much space is available. https://platform.claude.com/docs/en/build-with-claude/context-windows#:~:text=As%20token%20count%20grows%2C%20accuracy%20and%20recall%20degrade%2C%20a%20phenomenon%20known%20as%20context%20rot.%20This%20makes%20curating%20what%27s%20in%20context%20just%20as%20important%20as%20how%20much%20space%20is%20available.
- [theory] narrowing and widening the context window to craft your results
- [theory] context window = narrowing the probability space. the more context, the wider the probability space
- [observation] hallucinating a file path when one is not explicitly provided, but a directive says to "look for X", the agent hallucinates and guesses where X might be located, which may differ session to session
- [theory] context engineering: think about what you want the agent to definitively do and what you want to leave open. Where you want the agent's "creativity" to fill the gaps. (like enforcing structure in a template but leaving parts open-ended for the agent to make judgment calls on how to fill it)
- [theory] the quality of the artifacts produced will influence the success or failure of this implementation. issues with the fundamentals will compound over time and be difficult to catch when they start because they will be imperceptible at first
- [principle] you need to spend the time really thinking through what context/directives need to be explicit, what needs to be suggested, what needs to be intentional left open/vague
- [theory] minimal viable scaffolding to avoid the "checking boxes" behavior? -Polly 
  - scaffolding is definitely the right word - it's how much do you want the agent to have to hold onto vs how much do you want them to bring to the table to improvise on how to hold onto it. so it's about what you want. sometimes you _want_ box checking, but sometimes you want there to be "thought" behind the box, so you can instruct the agent more vaguely and tell it to use more judgment rather than holding onto facts (like a checkbox mentality would have you do)
- [observation] game designer is doing pretty well going from conversation -> draft proposal -> and even creating tasks for the reviewers to check it out
- [note] going to need to add a work planner that organizes the tasks based on their assignee and blocked_on
- [learning/debugging] i FINALLY found the bug: "Per the frame rules, I can only enter each state once. So if I exit review, I can't re-enter it in this session." - so it's thinking that when i say you can only enter it "once" that it means "each state once" not "once per session"...updated:
    1. You MUST ONLY enter one frame per session. (a->one, added "per session")
    2. You MUST ONLY enter one role per session.
    3. You MUST ONLY enter one state per session.
- [learning] useful to inspect tool use, file use, look for optimizations (how can you accept/reject less often, how can you make the agent find the right tool at the right time)
- [observation] i asked default agent to autonomously pick up the next task all on its own based on priority, which it did, but when it loaded the task it recognized and flagged a contradiction in its chain of thought; "⏺ Stop — the task contradicts the architecture spec, and I need to surface this before scaffolding." and "  The architecture spec was finalized today (2026-04-04), and the task was assigned today. The task overview appears to reflect an earlier draft before the server-deferred decision was locked in. The spec is
  authoritative per engineer protocol; I MUST NOT route around it by silently building either option."
- [observation] engineer/build flagging discrepencies (continuation so with context)
  - ⏺ Wait — before starting task #24 I need to flag something I just spotted in the proposal.

  The proposal (Section 3) lists 7 generators: Selfies, Memes, Hot Takes, Tutorials, Livestreams, Podcasts,
   Viral Stunts. Task #23 also says "All 7 base generators." But the architecture spec says "6 base types"
  and task #21 I just completed used provisional names based on that number.

  The correct generator IDs are already defined in the accepted proposal. I need to fix types.ts and
  static-data before implementing task #24, since algorithm state modifiers are keyed per generator. I'll
  also close task #34 since the answer was in the proposal all along.

  The architecture spec's "6 base types" appears to be a stale count — the accepted design is the authority
   here. I'll note the discrepancy for the architect.
- [observation] potentially related to Frank's introspective nature, he had this thought:
  - Before I write, one thing to note: the architect's specs live at .frames/sdlc/architecture/*.md as
  standalone docs. I'll mirror that convention and put the UX spec at .frames/sdlc/ux/core-game-screen.md.
  That matches what the engineer will expect to find.
- [observation] agent flagged an implicitly defined rule (but didn't prevent itself from doing it, so..): "Task is assigned to architect with state: build, but build is engineer-only. Per protocol I must stop and flag this."
- [observation] unit tests help the agent orient when it breaks things that previously worked, which is why they're still useful even if they're the ones writing them
- [theory] agents learn to recognize frictions with tools and can come up with workarounds, sometimes unintentionally like piping output from a tool into a python script so it can pretty-print the results for the user or pull fewer fields out
- [observation] the UI will help, but right now it's hard to manage so many instances because it's all the same agent so i need to rename the windows. it's also more annoying to manage because i have to be more explicit about which role i want an instance to be in. and the state thing not being able to switch is kind of annoying too.
- [observation] it didn't confirm before entering a state that it was able to in that role :(
- [task] need to make the task cleanup work really well. probably something we codify instead of leaving it to the agents to self-decide
- [observation] the agents all tend to review proposals positively... not much friction between the bots. might need to inject some antagonism in the reviews
- [observation] more taks more problems.. if we keep adding new tasks and tweaking it can make older tasks redundant. need a groomer (not that kind)
- [theory] having distinct roles with clear boundaries also helps the agents understand breadth of work better. like, "the architect exists, so i should probably have some architecture work exist here"
  - Polly:   The role signals what categories of work are real in this project. It's not just breadth awareness — it's a legitimacy signal. An agent without an architect in the room might produce something that works but never ask whether it's structured well. The architect's existence changes what questions are on the table.
  - It's almost like the team roster is a schema for the project's concerns. If a role doesn't exist, that domain of concern either doesn't exist or it falls into the gap between roles — and gaps are where things quietly rot.
- [learning] we need something like plan -> work in progress -> **done** like we need to track when something was actually completed, too
- [observation] just another example of respecting defined boundaries: "I need to flag this before touching code — what you're asking for was explicitly rejected in the accepted
  UX spec."
- [observation] i've noticed that agents will come up with workarounds for tools' output when they don't get what they want, or maybe because they get too much output (they think) or only want specific data. and if these things are their desires, but the tool doesn't support it like that, they will come up with clever python scripts or jq or w/e just to format it in the way they want.
- [observation] "Stop - I need to surface something" it says as it flags a real contradiction in what it's trying to do vs what is existing (there was an existing proposal it didn't expect and it was contradictory so it stopped what it was doing and raised it to the user)
- [principle] if an agent is misuing a tool, then the tool is not capturing the agent's needs. understand its desire and update the tool to accommodate
- [theory] with some tweaking, this could be a tool for creating quick POCs for someone like a PM. i don't even know how the code is structured right now and it doesn't matter. i can guide it with NL
- [observation] sometimes i wonder if the AI work well with json sure but don't _prefer_ it? like, to work with it internally it seems they don't really like it cuz i keep seeing them formatting the tool and preferring --pretty-print over the json blob. idk why though
- [observation] finally, the architect said it was not aligned and flagged major concerns. so it does do it but it needs a really big tipping point. but it went against me so that was i think a good sign
- [observation] the LLMs may actually prefer NL over code? they keep doing --pretty-print since it was added. 
  - but interestingly, the FRAME.yml YAML is easier to write/read for humans and the LLMs seem to understand it well, so maybe maps are good for them?
- [learning] I need epics...
- [observation] long session with multiple compactions caused the agent to start forgetting rules. the agent is not as clearly remembering rules like to load additional context files when entering a state. using the opus-1m @ 24% context
- [theory] compactions lessen importance of earlier rules to the agent?
- [learning] need to have an easier way for me to leave feedback on docs with the designers. 

SKills from polly
  1. "Capability packages with instructions and tools, loaded on-demand." — A skill is a bundle of a prompt (instructions) + tool access, packaged together. It's not loaded into the conversation until you actually
  invoke it (e.g., /commit).
  1. "Progressive disclosure without busting the prompt cache." — This is the key part:
    - Progressive disclosure means information is only shown when needed, rather than dumping everything upfront. Skills stay hidden until invoked, keeping the base system prompt lean.
    - Without busting the prompt cache — Anthropic's API caches the system prompt prefix. If you stuffed every skill's instructions into the system prompt from the start, the prompt would be huge. Worse, if
  different skills were loaded for different conversations, the system prompt would vary, meaning the cached prefix wouldn't match and you'd lose the cache hit (a "cache bust"). By loading skills on-demand after
  the conversation starts (injected into the conversation rather than the system prompt), the base system prompt stays identical across conversations, preserving the cache.

# Examples
- Difference between an agent following MUST and occasionally following COULD or MAY
- A problem which requires knowing two pieces of contradictory instructions at two separate times
  - To where the solution is you need to have two separate files with a single place to read from them and two separate sessions so as not to poison the context

# Open Questions
- How do agent harnesses manage context? How do they search their context? How do they map skills?
- What about network interfaces not just stdio for connections? dockerization, communication channels through SNS, dynamodb, other kinds of message queue adapters
- 

# Resources
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
  - Context engineering is the art and science of curating what will go into the limited context window from that constantly evolving universe of possible information.
  - "what configuration of context is most likely to generate our model’s desired behavior?"
  - "Effectively wrangling LLMs often requires thinking in context — in other words: considering the holistic state available to the LLM at any given time and what potential behaviors that state might yield."
  - "we’ve observed that LLMs, like humans, lose focus or experience confusion at a certain point. Studies on needle-in-a-haystack style benchmarking have uncovered the concept of context rot: as the number of tokens in the context window increases, the model’s ability to accurately recall information from that context decreases."
  - "Context, therefore, must be treated as a finite resource with diminishing marginal returns. Like humans, who have limited working memory capacity, LLMs have an “attention budget” that they draw on when parsing large volumes of context. Every new token introduced depletes this budget by some amount, increasing the need to carefully curate the tokens available to the LLM."
  - "models develop their attention patterns from training data distributions where shorter sequences are typically more common than longer ones. This means models have less experience with, and fewer specialized parameters for, context-wide dependencies."
  - "These realities mean that thoughtful context engineering is essential for building capable agents."
  - "good context engineering means finding the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome"
  - "we see engineers hardcoding complex, brittle logic in their prompts to elicit exact agentic behavior. This approach creates fragility and increases maintenance complexity over time." and "engineers sometimes provide vague, high-level guidance that fails to give the LLM concrete signals for desired outputs or falsely assumes shared context"
  - "techniques like XML tagging or Markdown headers to delineate these sections, although the exact formatting of prompts is likely becoming less important as models become more capable."
  - "we recommend working to curate a set of diverse, canonical examples that effectively portray the expected behavior of the agent. For an LLM, examples are the “pictures” worth a thousand words."
  - "Rather than pre-processing all relevant data up front, agents built with the “just in time” approach maintain lightweight identifiers (file paths, stored queries, web links, etc.) and use these references to dynamically load data into context at runtime using tools."
  - "Beyond storage efficiency, the metadata of these references provides a mechanism to efficiently refine behavior, whether explicitly provided or intuitive. To an agent operating in a file system, the presence of a file named test_utils.py in a tests folder implies a different purpose than a file with the same name located in src/core_logic/ Folder hierarchies, naming conventions, and timestamps all provide important signals that help both humans and agents understand how and when to utilize information."
  - Progressive disclosure: like "Each interaction yields context that informs the next decision: file sizes suggest complexity; naming conventions hint at purpose; timestamps can be a proxy for relevance."
  - this is like, part of "why" we do this: "Without proper guidance, an agent can waste context by misusing tools, chasing dead-ends, or failing to identify key information."
  - "primitives like glob and grep allow it to navigate its environment and retrieve files just-in-time, effectively bypassing the issues of stale indexing and complex syntax trees."
  - "Given the rapid pace of progress in the field, "do the simplest thing that works" will likely remain our best advice for teams building agents on top of Claude."
  - Creating a design document for how you're going to prompt the AI
  - "Structured note-taking, or agentic memory, is a technique where the agent regularly writes notes persisted to memory outside of the context window. These notes get pulled back into the context window at later times."
  - "Sub-agent architectures provide another way around context limitations. Rather than one agent attempting to maintain state across an entire project, specialized sub-agents can handle focused tasks with clean context windows. The main agent coordinates with a high-level plan while subagents perform deep technical work or use tools to find relevant information. Each subagent might explore extensively, using tens of thousands of tokens or more, but returns only a condensed, distilled summary of its work (often 1,000-2,000 tokens)."
  - 
- https://platform.claude.com/docs/en/build-with-claude/context-windows
- https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
- https://arxiv.org/abs/1706.03762
- https://huggingface.co/blog/Esmail-AGumaan/attention-is-all-you-need
- 