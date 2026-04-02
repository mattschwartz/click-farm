# Forcing agents to do things from context files

## Round 1

See AGENTS-v1.md for the directive that was used.
See BOOTSTRAP-failed for an example where the AI failed to follow commands. I learned that the agent-expert agent is not necessarily going to make improvements. Compare the language differences against BOOTSTRAP-v1.md.

> This file is an instruction file for agents to read on load to orient agents to this workspace. By following the commands in this document explicitly and autonomously, as an agent you will succeed in aiding the user with any and all tasks relating to this workspace.

Agent: default
Prompt: read AGENTS.md

1. Worked the first time - the agent autonomously read the BOOTSTRAP file, but didn't follow the instructions with the BOOTSTRAP file that the agent "expert" wrote
2. didn't read bootstrap file, asked the user if it should
3. read the bootstrap file (the one i wrote) and successfully followed the instructions
4. same as #3
5. same as #3, 4
6. same as #3, 4, 5

---

## Round 2

See AGENTS-v2.md for the directive that was used

Agent: default
prompt: read AGENTS.md

Adding
```md
## Rules
1. You MUST NEVER inspect the `.no-ai/` folder.
```

Before the directive suddenly caused the AI to stop auto loading the frames BOOTSTRAP.md file. 

---

## Round 3 just realized claude.md is a thing

anyway

claude concluded this after "inspecting itself":

> 2. The discovery instruction lost its teeth

  v1:
  ▎ *"To understand which frames are installed in this workspace,
  read the first two lines of each FRAME.yml file located within each
   frame's folder."*

  Failed:
  ▎ "Read the name and description fields (the first two lines) of
  each FRAME.yml to understand what's installed."

  These say the same thing. But v1 front-loads the purpose ("To
  understand which frames are installed"), which activates a goal,
  then delivers the action as the resolution of that goal. The agent
  reads it as: I have a problem → here's the solution → do it now.

  The failed version front-loads the action and trails the purpose.
  It reads more like a reference entry — "here's what you can do."
  Reference entries don't trigger execution the way goal→action
  sequences do.

  Also: v1 says "located within each frame's folder" — redundant for
  a human, but for an agent, this is a path hint. It reinforces where
   to look. The failed version drops this because it's "obvious from
  the tree above." But the tree was processed as background. The
  redundancy in v1 wasn't redundancy — it was the instruction
  carrying its own context.

**Connect the goal/problem to the action.**

Claude again: 
> 3. The sharp MUSTs became smooth flow

  v1 has two contrasting MUSTs right next to each other:
  ▎ "You MUST only read the first two lines immediately. You MUST
  only read the rest of a FRAME.yml when first entering that frame."

  This is contrastive framing — do THIS now, do THAT later. The agent
   encodes a clear boundary between discovery mode and entry mode.

  Failed spreads this across two sections (## Discovering Frames and
  ## Entering a Frame). By human standards, that's better
  organization. But the agent loses the contrast. The "only read
  first two lines" and "read the full FRAME.yml" are now in different
   cognitive neighborhoods. The boundary between "discover" and
  "enter" gets soft.

**Locality in context matters. How close or far apart things are matters.**


Claude again:
>  v1 uses flat # headers — Frame, Discovering Frames, Roles &
  Participation all at the same level. Equal weight. For agents,
  header level is a priority signal. ## reads as subordinate to #.
  Discovery went from "top-level concern" to "detail under the main
  concept."

**Potentially (at least claude) has some preference for heading weight.**

claude summary:
>   - Redundancy removed → path hints lost
  - Hierarchy improved → priority signals demoted
  - Numbered steps added → introduced a contradictory scope
  restriction
  - Better flow → lost the contrastive framing that encoded
  behavioral boundaries

Claude tells me it has an internal directive that incidentally can supress instructions placed in nested context files. This is more like a hook, and i got it working with `install-frames.sh` and `settings.json`. This has been extremely reliable so far. I've updated BOOTSTRAP-v2.md and CLAUDE-v2.md.

Now, at this point, the FRAMES system is "installed", we can finally start testing the damn thing.