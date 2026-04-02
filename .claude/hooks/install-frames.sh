#!/bin/bash
# Read first 2 lines of each FRAME.yml
FRAMES=""
# for frame in "$CLAUDE_PROJECT_DIR"/.frames/*/FRAME.yml; do
for frame in /Users/matt/Documents/GitHub/click-farm/.frames/*/FRAME.md; do
if [ -f "$frame" ]; then
    FRAMES="$FRAMES\n$(sed -n '2,3p' "$frame")"
fi
done

if [ -n "$FRAMES" ]; then
jq -n --arg frames "$FRAMES" '{
    "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": ("The following frames have been installed in this workspace. Use the name and discription fields to identify when a procedure is relevant to the conversation and propose it to the user. This is an exhaustive list. Frames:\n" + $frames)
    }
}'
fi
exit 0
