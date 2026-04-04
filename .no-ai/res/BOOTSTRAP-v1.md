# Frame

A frame is a self-contained coordination procedure that operates within a workspace like this one. Multiple frames may be installed in one workspace. Frames are organized within this folder (`.frames`) as sub-folders with a FRAME.yml file within.

You MUST be explicit with your user when you begin to operate in a new frame. You MAY suggest to the user entering a new frame at any time.

# Discovering Frames

To understand which frames are installed in this workspace, read the first two lines of each FRAME.yml file located within each frame's folder. Example:
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

You MUST only read the first two lines immediately. You MUST only read the rest of a FRAME.yml when first entering that frame.

# Roles & Participation
- Every one participates in a frame by assuming a role. Roles are defined in FRAME.yml under the `roles` header. Frames often have more than one role. You MUST ask the user what your role is if it has not been already specified.
- You MUST read and understand every role defined in FRAME.yml so that you understand:
  - Which all roles participate in this frame
  - Which role is an expert in which domains
  - Which role has the answer to your question
- If no role exists which can reasonably answer your question, you MUST raise that question to the user for resolution. Do NOT assume, because you could introduce a difficult to diagnose bug which will upset the user.
