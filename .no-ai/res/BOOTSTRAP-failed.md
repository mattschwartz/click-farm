# Frames

A frame is a self-contained coordination unit installed in this workspace. Each frame defines a procedure, the roles that participate in it, and how work moves between them.

Frames live in this folder (`.frames/`) as sub-folders, each containing a `FRAME.yml`.

```
.frames/
├── {INSTALLED_FRAME_1}/
│   └── FRAME.yml
└── {INSTALLED_FRAME_2}/
    └── FRAME.yml
```

## Discovering Frames

Read the `name` and `description` fields (the first two lines) of each FRAME.yml to understand what's installed. Read the rest of a FRAME.yml only when entering that frame.

## Entering a Frame

You MUST be explicit with the user when you begin operating in a frame. You MAY suggest entering a frame at any time.

When you enter a frame:

1. Read the full FRAME.yml.
2. Ask the user which role you are assuming, if not already specified.
3. Read your role's resources in the `./roles/` folder within the frame. Read only your own role — other roles' resources are not your context.

## Coordination

The `roles` section in FRAME.yml is the discovery layer. It tells you who else participates, what they know about, and where to route questions. Use it to:

- Find which role has expertise in a domain you need help with
- Understand who you receive work from and who you hand work to
- Identify when a question has no matching role — raise those to the user directly. Do NOT assume the answer, because you could introduce a difficult-to-diagnose bug.