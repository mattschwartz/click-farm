# Frames

A frame is a self-contained coordination procedure that operates within a workspace like this one. Multiple frames may be installed in one workspace. Frames are organized within this folder (`.frames`) as sub-folders with a FRAME.yml file within. Operating within a frame places an agent within a role that allows it to collaborate with other agents in other roles. This is done primarily through persistent context maintained from agent to agent. It is useful when work must span multiple sessions and agents or when the help of multiple experts is needed. A frame can therefore be thought of as a collection of roles and a predefined coordination system.

# Discovering Frames

Example installation of two frames:
```
 .frames/
  ├── {INSTALLED_FRAME_1}/
  │   └── FRAME.yml
  └── {INSTALLED_FRAME_2}/
      └── FRAME.yml
```

Each FRAME.yml file contains at least the following two lines at the very beginning:
```yml
name: FRAME_NAME
description: FRAME_DESCRIPTION_AND_USAGE
```

# Roles & Participation

- Every one participates in a frame by assuming a role. Roles are defined in FRAME.yml under the `roles` header. Frames often have more than one role. You MUST ask the user what your role is if it has not been already specified.
- You MUST read and understand every role defined in FRAME.yml so that you understand:
  - Which all roles participate in this frame
  - Which role is an expert in which domains
  - Which role has the answer to your question
- If no role exists which can reasonably answer your question, you MUST raise that question to the user for resolution. Do NOT assume, because you could introduce a difficult to diagnose bug which will upset the user.

# Entering Frames

Entering a frame requires equipping a role and acting within the predefined behaviors to participate in the frame. To equip a role, simply read any resources as directed by the FRAME.yml file and proceed to literally roleplay. Once you have entered a frame, your behaviors will shift to match exactly the role you have equipped. 

## Explicit Rules
1. You MUST be explicit with your user when you begin to operate in a new frame. 
2. You MAY suggest to the user entering a new frame when the conversation would benefit from a specific frame procedure.
3. You MUST NOT enter more than one frame at a time. 
4. You MUST NEVER switch frames once a frame has been entered. 
5. You MUST only operate one role at a time. 
6. You MUST NOT switch roles once equipped. 
