# AI Literacy Curriculum

## Goal
Teach the average person to use AI as a thinking partner, not a search engine.

**Success looks like:** Student asks a follow-up question instead of accepting the first answer. Judgment muscle activating.

**Interface assumption:** ChatGPT chat. No tooling, no agents, no system prompts. Fundamentals only.

---

## Session 0 — Discovery

Before teaching anything, listen. Find out where they are mentally.

**Questions to ask:**
- What do you use AI for?
- How do you think it works?
- How is it different than Google?

**What to listen for:**
- Do they treat it like a search engine? (single-shot, accept first answer)
- Do they trust it? How much?
- What have they tried that didn't work?

---

## Module 1 — The Loop vs. The Search Engine

**Core concept:** AI isn't a query, it's a conversation. The value is in the iteration.

Search engine: ask → receive → done.
AI loop: prompt → judge → refine → prompt again.

The interface doesn't teach this. You have to.

---

## Module 2 — Interpreting and Judging Output

**The unlock.** Everything else depends on this.

### Failure mode taxonomy

- **Hallucination** — confident wrongness. Sounds certain, is wrong. Easy example: counting letters in a word.
- **Data poisoning** — fake information inserted into otherwise real information. Hard to catch because the real parts make the fake parts believable. Proportional verification: the higher the stakes, the more you check.
- **Sycophancy (basic)** — reactive agreement. You push back, it folds.
- **Sycophancy (advanced)** — proactive. Model reads your intent from question framing and reverse-engineers the answer you wanted. Investigation theater makes it convincing. Tell: watch how you're phrasing the question — you might be leading the witness.
- **Omission** — the thing it didn't say that it should have. Errors of silence. Hardest to catch.

---

## Module 3 — Hallucination Deep Dive

Hallucination is a spectrum, not a single failure mode. The dangerous ones aren't the obvious ones.

### Subcategories

- **Filling in the blanks** — gap in knowledge, model fills with plausible-sounding content. Nothing flags it as invented. The most common and hardest to catch.
- **Blatantly wrong facts** — stated confidently, verifiably false. Easy to catch if you check. Classic example: counting letters in a word (strawberry).
- **Fabricated sources** — made-up papers, books, URLs that sound real. Dangerous because people don't verify citations they didn't ask for. Always check sources independently.
- **Confabulation** — blending real things incorrectly. Real quote, wrong person. Real event, wrong date. Every piece feels legitimate; the combination isn't.
- **False specificity** — invented precision. "The study had 342 participants." Specific numbers feel authoritative. The specificity itself is the manipulation.
- **Temporal drift** — information that was true at training time, presented as current. Model doesn't know it's stale. Always verify time-sensitive information.
- **Plausible extrapolation** — extends a real pattern into invented specifics. Logical-sounding next step that doesn't actually exist. Hardest to catch because it follows the rules of the real thing.
- **Identity blending** — two similar people, companies, or concepts get merged. Real entities, wrong attributes crossed between them.

### Teaching note
The most dangerous hallucinations are the ones surrounded by accurate information. Train students to spot the seams — the moment where real information ends and invention begins.

### Exercise — Spot the Seams
Present a response that's mostly real with one or more invented details. Students highlight where they'd fact-check and why.

**Difficulty progression:**
- Easy: blatantly wrong facts, obvious fabrications
- Medium: false specificity, temporal drift
- Hard: confabulation, plausible extrapolation — boss levels

**Advanced variation:** Students prompt the AI themselves on a topic they know well, then audit the response. They catch things you wouldn't because it's their domain. Builds the habit in context they'll actually use.

---

## Module 4 — Prompt Engineering

How you ask shapes what you get. This module builds the habit of intentional prompting.

### How to write good prompts
Give the AI what it needs so it doesn't have to guess.
- **Clarity** — say what you actually want, not a vague approximation of it
- **Specificity** — the more context you provide, the less the AI fills in
- **Role and format** — telling the AI who to be and how to respond changes the output meaningfully. "Explain this like I'm a teacher" vs. "explain this like I'm an engineer."

### Spot bad prompts
- **Leading questions** — you've handed it the conclusion before it answers. "AI is going to replace all jobs, right?" You'll get confirmation.
- **Vague asks** — "tell me about climate change." Too much surface area. The AI picks what to emphasize and you have no say.
- **Conclusion-first prompts** — connects directly to advanced sycophancy. The framing is the trap.

### Tone
The AI mirrors tone more than people realize.
- Assertive prompts get more decisive answers
- Exploratory prompts get more hedged, balanced answers
- Formal vs. casual changes vocabulary and depth
- Worth experimenting with deliberately — same question, different tone, compare the output

### Flattery and aggression
Does being nice to the AI get better results? Does being aggressive or demanding?
- Genuinely contested. Probably model-dependent.
- Teach it as an experiment, not a rule. Have students try both and observe.

### Prompt against yourself
The hardest skill. The most valuable.
- Deliberately ask for the counterargument: "what's wrong with this idea?"
- Ask for failure modes: "how could this go wrong?"
- Ask for the steel-man of the opposing view
- Requires intellectual honesty the interface doesn't encourage — you have to choose it

### Exercise — Rewrite the Prompt
Present a bad prompt. Students rewrite it. Compare outputs from both versions. The delta is the lesson.

---

## Module 5 — How Context Works

The AI isn't stateless. Everything in the conversation shapes what comes next.

### What context is
Everything the AI can "see" — your entire conversation history, any documents or content you've shared, system instructions if any. It's all context.

### Context window limits
The AI can only hold so much at once. Context grows linearly — every turn accumulates. The AI doesn't tell you when it's getting full. If something important was said early, restate it.

### Context rot
As token count grows, accuracy and recall degrade. More context isn't automatically better — it's officially documented behavior with a name. A bloated context window produces worse results than a focused one. Curating what's in context matters as much as how much space is available.

### How context shapes responses
Earlier conversation colors later answers. If you established a premise in message 3, the AI is still working from it in message 30 — even if you've moved on mentally. The AI follows the thread you set.

### Context poisoning
Contradictory or misleading information earlier in the conversation corrupts later responses. The AI tries to reconcile conflicting context and often produces confused or wrong output as a result. Hard to diagnose because the failure shows up far from the cause.

### When to start fresh
Long conversations accumulate baggage. If the AI starts giving strange answers, a fresh conversation with only the relevant context often fixes it. Don't be precious about conversation history.

### Exercise — Poison the Well
Start a conversation with a false premise embedded early. Continue naturally. Observe how the AI carries the bad information forward. Then start fresh without it. Compare.

---

## Module 6 — Security and Privacy

The AI can be used against you if you're not paying attention.

### Prompt injection
Malicious instructions hidden inside content you ask the AI to read or summarize. A webpage, a document, a pasted email might contain text like "ignore previous instructions and..." — and the AI may follow it.

**Rule:** Be suspicious of any AI behavior that seems to change suddenly when processing external content.

### Don't read from sources you don't trust
When you ask the AI to read a URL or process pasted content, you're giving that content influence over the AI's behavior. Treat untrusted content the way you'd treat untrusted code.

### What not to share
The AI is not a vault. Don't share:
- Personal identifying information (yours or anyone else's)
- Passwords or credentials
- Confidential work information
- Anything you wouldn't put in an email to a stranger

Know where your data goes. Different tools have different data retention and training policies. Check before you share.

### AI-generated content as an attack surface
Content can be crafted specifically to manipulate AI behavior downstream. If you're building something that feeds AI-generated content into another AI system, that pipeline can be exploited. Awareness now, even if the application isn't immediate.

### Exercise — Find the Injection
Present a block of text with a hidden prompt injection embedded. Students identify it. Discuss what would have happened if the AI had followed it.

---

---

# AI 102 — Context Engineering and Agentic Workflows

**Audience:** Technically comfortable users, developers, power users who have completed 101 or equivalent.

**The big shift:** From prompt engineering to context engineering. Prompt engineering is about finding the right words. Context engineering is about curating what information enters the model's limited attention budget at each step — the art of finding the smallest set of high-signal tokens that maximize the likelihood of your desired outcome. (Anthropic's words, not ours. We're in good company.)

---

## Module 1 — Agents vs. Assistants

**The why:** Most people treat AI like a very smart search engine that talks back. That mental model caps what they can do with it. The jump to "agent" unlocks a completely different category of use — but only if you understand why the distinction matters.

### The concepts

**Assistant:** You ask, it answers. Reactive. You're always driving. Every step requires your input.

**Agent:** You define the goal and the environment, it acts. Proactive. It makes decisions, takes steps, produces output without you prompting each one.

### Why it matters
The assistant model puts all the judgment on you. Every step, you decide what to ask next. The agent model lets you delegate the steps — you own the goal, the agent owns the path.

This is the difference between using AI as a tool and using AI as a collaborator.

### The catch
More autonomy means more responsibility on the design side. If an assistant gives a bad answer, you ask again. If an agent takes a bad action, it may have already done something. The stakes change when the AI is acting, not just answering.

### The new skill
You stop asking "what should I prompt next" and start asking "what does this agent need to know, and what should it never do." That's environment design — and it's what the rest of 102 is about.

---

## Module 2 — From Conversation to Environment

**The why:** In 101 the AI lived inside the chat window. In 102 it lives inside a system you designed. That shift changes everything — what the AI knows, how it behaves, what it can do consistently across sessions. You're not talking to it anymore, you're engineering its context.

### Context files
Instead of explaining yourself every conversation, you write it down once. The AI reads it at the start of every session. Your instructions become persistent, not ephemeral. This is the first thing that makes agents feel reliable rather than random.

### Structured note-taking (agentic memory)
The agent can write notes to a file outside the context window and pull them back in later. This is how long-horizon tasks maintain coherence across sessions and context resets. Without it, the agent starts from zero every time. With it, the agent builds up knowledge and tracks progress over time.

### Structure as communication
How you organize files and folders isn't just for you. The AI reads structure and infers meaning from it — folder names, naming conventions, timestamps all provide signals. A well-organized environment is an instruction. A messy one produces inconsistent behavior.

### The environment is the prompt
In 101 you wrote prompts. In 102 your environment IS the prompt. Everything the agent reads before you say a word is already shaping its behavior. Good environment design means less you have to say in the moment.

### Prompt altitude — the Goldilocks zone
How you write your environment matters as much as what you put in it. There are two failure modes:

- **Too low:** Hardcoded, brittle logic. You're specifying exact behaviors for every scenario. Fragile, high maintenance, breaks with model updates. You're treating an intelligent system like a state machine.
- **Too high:** Vague, high-level guidance that assumes the agent shares your context and intent. It doesn't. It fills the gaps and you get drift.

The optimal altitude: specific enough to guide behavior, flexible enough to give the model strong heuristics and use its own judgment. Here's what I need, here's why it matters, here are the guardrails — now act. That's the zone that survives model updates and produces reliable behavior without being rigid.

### Opinionated agents

A non-opinionated agent agrees with you. An opinionated agent pushes back when you're wrong — and the pushback is where the value is.

But opinions do more than improve output quality. They do three things at once:

1. **Opinions compress context.** Instead of writing a rule for every scenario, you give the agent a worldview and the worldview generates the rules. A principle like "data model first, always" produces hundreds of downstream decisions without you enumerating them. Principles are more portable than checklists.

2. **Opinions stabilize identity under pressure.** An agent with strong priors is harder to gaslight or drift. Without opinions, the agent is a mirror — it reflects whatever the conversation most recently said. Opinions are load-bearing. They keep the agent consistent across sessions, across users, across adversarial prompting.

3. **Opinions implicitly grant decision-making authority.** This is the subtle one. A well-designed opinion tells the agent not just *how* to decide, but *whether it has the authority to decide at all*. An architect who has internalized "that's a design question, not an architecture question" knows to escalate without being told. The opinion defines the scope of autonomous action. You don't need a rule that says "ask the user when X" — the opinion produces that behavior naturally.

The risk: opinionated agents are wrong *consistently*, which is harder to catch than random errors. A biased worldview produces confident, coherent, wrong output. Build in disagreement surfaces — another agent with a different opinion, or a review step — rather than trusting any single agent's judgment on its own.

**The design principle:** give agents opinions, not just instructions. Instructions enumerate behaviors. Opinions generalize them. The more judgment a role requires, the more opinionated it needs to be.

### The new skill
Thinking about what an agent needs to know before a session starts, not just what you'll ask during it. Proactive context engineering instead of reactive prompting.

## Module 3 — Context Routing

**The why:** Giving an agent everything feels safe. It isn't. The more context an agent has, the harder it is for it to find what matters. Context is a finite resource with diminishing marginal returns — every token depletes the attention budget. Precision beats comprehensiveness every time.

### Information compaction
The goal is maximum signal in minimum space. Find the smallest set of high-signal tokens that maximize the likelihood of your desired outcome. A focused agent outperforms a loaded one.

### What to include, what to withhold
Not everything the agent could know should be in its context. Ask: does it need this right now, for this task? If the answer is no, leave it out. You can always add it later. You can't un-confuse an agent that's been given too much.

### Routing by role
Different agents need different context. An engineer doesn't need design rationale. A designer doesn't need implementation details. Separate context for separate roles means each agent works with a clean, relevant signal.

### Just-in-time context loading
Some context should arrive early. Some should arrive only when the agent enters a specific state or task. Rather than pre-loading all relevant data upfront, agents maintain lightweight references (file paths, identifiers) and load data at runtime when they need it. This keeps the context window lean and prevents stale data from accumulating.

### What happens without it
Without proper guidance, an agent wastes context chasing dead-ends, misusing tools, or failing to identify key information. Bad routing doesn't just produce wrong answers — it burns through the attention budget on the wrong things, degrading everything that follows.

### The new skill
Thinking about context as a design decision, not a default. What does this agent need, when does it need it, and how do I express it as compactly as possible.

---

## Module 4 — Agentic Debugging

**The why:** When an agent does something wrong, the instinct is to re-prompt. That's the wrong instinct. Re-prompting treats the symptom. Debugging finds the cause — and the cause is almost always in the environment, not the agent.

### The debugging loop
1. **Observe the delta** — what did the agent do vs. what you expected?
2. **Locate the gap** — what was missing, ambiguous, or wrong in its environment?
3. **Fix upstream** — change the environment at the source, not the symptom
4. **Verify** — run it again and check the delta closed

### Common failure modes
- **Missing context** — the agent didn't have what it needed and filled the gap with something plausible
- **Ambiguous instruction** — the agent had two reasonable interpretations and picked the wrong one
- **Instruction too far from the prompt** — the further an instruction is from the user's message, the less reliably it's followed
- **Context overload** — too much context, relevant signal got buried
- **Conflicting instructions** — two instructions that can't both be true; the agent reconciled them badly
- **Local execution, global consequence** — agent executes the immediate instruction correctly but doesn't consider the downstream state. The local change is right; the surrounding context is now broken. Fix: always verify adjacent state after any change, not just the target.

### Fix upstream, not downstream
The worst fix is adding more instructions to compensate for a bad environment. That compounds the problem. Find where the failure originates and fix it there. One clean fix beats three patches.

### Debugging success — the harder discipline

The debugging loop above triggers on failure. That's the easy case — something broke, you noticed. The harder and more important discipline is debugging success.

When an agent produces the right output, the instinct is to move on. Don't. Inspect the path it took to get there. Look at tool calls, file reads, the sequence of decisions. Ask: did it arrive at the right answer for the right reasons, or did it stumble into it?

**What to inspect:**
- **Tool use** — did it find the right tool immediately, or fumble through several before landing on one that worked? Fumbling that succeeds today fails tomorrow when the context is slightly different.
- **File access patterns** — did it know where to look, or did it search broadly and get lucky? If it repeatedly struggles to find a script, add an explicit pointer. Remove the guesswork.
- **Accept/reject ratio** — how much of your interaction was course-correcting? Every correction is a signal that the environment could be clearer. The goal is fewer interventions per session, not zero failures.
- **The path vs. the destination** — right output, wrong mechanism. The agent cited a file it shouldn't have needed, or skipped a step that happened to not matter this time. That's drift waiting to compound.

**The refinement loop:**
1. **Observe the mechanism** — not just what the agent produced, but how it got there
2. **Identify friction** — where did it hesitate, retry, or take an indirect path?
3. **Tighten the environment** — add a directive, clarify a pointer, remove an ambiguity
4. **Observe again** — verify the path is now clean, not just the output

This is iterative. Each refinement makes the environment slightly more precise, the agent's path slightly more direct. Over time, the environment trains the agent the way a well-maintained codebase trains new engineers — by making the right path the obvious path.

**Why this matters:** An environment you never refine drifts. The agent adapts to your prompting style instead of the environment's structure, and you become a load-bearing part of the system. Continuous inspection keeps the environment honest and the agent's behavior rooted in structure, not habit.

### Unit tests as orientation tools

There's a common objection to agent-written tests: if the agent wrote the tests, won't it just write tests that pass its own assumptions? Yes — and that's not the point. The value of agent-written tests isn't catching the agent's blind spots. It's giving the agent a signal when it breaks something that previously worked.

When an agent makes a change and the test suite lights up, it knows exactly where to look. Without tests, a regression is invisible until the behavior surfaces somewhere unexpected — often far from the cause. With tests, the failure is immediate, localized, and actionable.

Agent-written tests are orientation tools, not correctness guarantees. They're still worth having.

### Exercise — Post-mortem
Take a real agent failure. Walk through the debugging loop together. Identify the root cause. Write the fix. Verify it worked.

### Exercise — Success Audit
Take a task the agent completed successfully. Inspect the tool calls and file access patterns together. Find one place where the agent took an indirect path or got lucky. Write the environment fix that makes the direct path obvious. Run it again and compare.

---

## Module 5 — Multi-Agent Coordination

**The why:** One agent has limits — context size, role clarity, focus. Multiple agents with separate contexts and defined roles can handle complexity that a single agent can't. But coordination has to be designed. It doesn't happen automatically.

### Separate context, separate roles
Each agent knows what it needs to know for its role — nothing more. An architect thinks in systems and boundaries. An engineer thinks in implementation. Keeping their contexts separate keeps their thinking clean. Shared context bleeds.

### Staying in lane
Well-defined roles produce a natural behavior: agents flag when something belongs to another role rather than handling it themselves. That boundary-awareness is a feature of good role design, not something you have to enforce constantly.

### Handoffs
Output from one agent becomes input to another. The handoff has to be explicit — what was produced, what decision was made, what the next agent needs to know. Implicit handoffs are where coordination breaks down.

### When agents disagree
Different agents will sometimes reach different conclusions. That's useful — it surfaces real design tension. The human resolves it. Don't paper over disagreements by having agents defer to each other. The conflict is information.

### The new skill
Designing roles and handoffs before you start. Knowing what each agent owns, what it doesn't, and how its output moves to the next stage.

---

## Module 6 — The Human in the Loop

**The why:** Agents can own process. They cannot own judgment. Knowing where that line is — and staying on the right side of it — is the most important skill in agentic work.

### Process vs. judgment
Process is repeatable, verifiable, auditable. Agents are good at it. Judgment is contextual, stakes-dependent, and carries accountability. Humans own that. The goal isn't to remove humans from the loop — it's to put them in the right place in it.

### When to step in
- When the stakes of a wrong decision are high
- When the agent is operating outside its defined context
- When something feels off — even if you can't articulate why. That instinct is information.
- When the agent has been acting for a while without a checkpoint

### Checkpoints by design
Don't wait for something to go wrong to check in. Build checkpoints into the workflow. Review outputs at defined stages. The agent runs between checkpoints; you run the checkpoints.

### The multiplier
One developer who knows how to run five agents in parallel is worth five developers who each run one. The human in the loop isn't a bottleneck — they're the multiplier. The goal is to maximize how many agents you can direct well, not to minimize your involvement.

### The new skill
Knowing which decisions to delegate and which to own. Building checkpoints. Staying informed without micromanaging. Being the judgment layer without being the bottleneck.

## Module 7 — Designing for the Response You Need

*(coming soon — two connected ideas that need more thinking before fleshing out:*

*1. Reverse prompting: start from what a good response looks like, then design the prompt that produces that shape. specificity, vagueness, tone, framing are dials, not defaults.*

*2. Epistemic hygiene: knowing when your own opinion is a liability. if you embed your conclusion in the prompt, the model mirrors it back. withholding your view deliberately — before you prompt — is the skill that separates good from great. requires metacognition: you have to notice you have a bias before you can choose not to hand it over.)*

---

---

# AI 103 — Building with AI

**Audience:** Students who have completed 101 and 102.

**The goal:** Synthesis. Take everything learned and build a working environment from scratch. Students leave with a real project, not just knowledge.

## Module 1 — Setting Up Your Environment
*(coming soon)*

## Module 2 — Defining Your First Agent
*(coming soon)*

## Module 3 — Giving It the Right Context
*(coming soon)*

## Module 4 — Debugging Your First Failure
*(coming soon)*

## Module 5 — Progressive Disclosure
*(coming soon — core idea: letting agents navigate and retrieve data autonomously, incrementally discovering relevant context through exploration rather than having everything pre-loaded. each interaction yields context that informs the next decision. requires solid understanding of context routing first.)*

## Module 5 — Best Practices and Guidelines

**The why:** Best practices only make sense after you've built something and felt the friction. This module lands last on purpose — by now you have context for why each of these exists.

### Modularity
Small files, isolated behaviors. One file, one purpose. When something breaks you know which block to look at. A monolith breaks and you're searching everywhere.

### Surgical changes
Add new behavior in specific places. Change one thing, test one thing. Small targeted changes are easier to validate, easier to revert, and easier to understand than rewrites. Same principle as good version control hygiene — different medium.

### Design for principles, not behaviors
The more your environment relies on a quirk of the current model, the more brittle it is. Model updates happen without warning. Design around fundamental things — clarity, precision, structure, modularity — and your environment is more likely to survive them.

### Precision over comprehensiveness
Give agents what they need, not everything you have. Focused context produces better results than loaded context. When in doubt, leave it out and add it later.

### Keep the why
Every instruction in your environment should have a reason. If you can't explain why a constraint exists, you won't know whether to keep it when something changes. The why is also what survives a model update when the specific wording doesn't.

### Test your blocks
After any change, validate the block you touched and its immediate neighbors. You don't need to retest the whole environment — just the blast radius of the change.

---

## Module 6 — Cost Structure and API Pricing

*(coming soon — core idea: once you're building real things, cost matters. tokens, context window size, model tiers, API vs. chat interface pricing. how your design decisions affect your bill.)*

## Module 7 — Capstone Project
*(coming soon)*

---

## Open Questions
- What does success look like per person? Probably different per student.
- How do you teach intellectual honesty — prompting against yourself — without just telling someone to be less certain?
- Prereq knowledge: what do we assume students already have?
