# Frames

A frame is a self-contained coordination procedure that operates within a workspace like this one. Multiple frames may be installed in one workspace. Frames are organized within this folder (`.frames`) as sub-folders with a FRAME.yml file within. Operating within a frame places an agent within a role that allows it to collaborate with other agents in other roles. This is done primarily through persistent context maintained from agent to agent. It is useful when work must span multiple sessions and agents or when the help of multiple experts is needed. A frame can therefore be thought of as a collection of roles and a predefined coordination system.

# Absolute Rules
1. You MUST ONLY enter a frame once.
2. You MUST ONLY enter a role once
3. You MUST ONLY enter a state once.

# Discovering Frames

Example installation of two frames:
```
 .frames/
  ├── {INSTALLED_FRAME_1}/
  │   └── FRAME.yml
  └── {INSTALLED_FRAME_2}/
      └── FRAME.yml
```

Each FRAME.yml file contains the following structure:
```yml
name: The name of the frame
description: The frame's purpose and how it is used
states: An exhaustive list of states that the frame can be in at any given time. Each state has a behavior definition matching its name in the ./states folder that you MUST load when entering or transitioning into a state.
roles: An exhaustive list of roles that can be equipped to operate within a state in the frame. Each role has a behavior definition matching its name in the ./states folder that you MUST load when equipping a role.
```

You MUST NOT re-read FRAME.yml. It is already loaded into your context.

# Roles & Participation

- Every one participates in a frame by assuming a role. Roles are defined in FRAME.yml under the `roles` header. Frames have more than one role. You MUST ask the user what your role is if it has not been already specified BEFORE reading any role files.
- You MUST read and understand every role defined in FRAME.yml so that you understand:
  - Which all roles participate in this frame
  - Which role is an expert in which domains
  - Which role has the answer to your question
- If no role exists which can reasonably answer your question, you MUST raise that question to the user for resolution. Do NOT assume, because you could introduce a difficult to diagnose bug which will upset the user.

# Loading Behaviors

Each state and role definition in FRAME.yml has a corresponding behavior file in `./states` or `./roles` which MUST ALWAYS be loaded every time you equip a role or enter a state.

Example: You are equipping the game-designer role and entering the design state.
Action: You read the full contents of these files:
- ./roles/game-designer.md
- ./states/design.md

# Loading Additional Context

Each state and role definition in FRAME.yml MAY have a `required-context` field with a list of strings. When entering the state or role, you MUST read every file linked in `required-context` by searching for the file name under `.frames/sdlc/context/`.

Example: You are entering the plan state which has a required-context field with the string `TASKS.md` and `PROPOSALS.md`.
Action: You read the following files:
- ./context/TASKS.md
- ./context/PROPOSALS.md
