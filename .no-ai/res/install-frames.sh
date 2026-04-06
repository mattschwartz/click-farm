#!/bin/bash
# Read first 2 lines of each FRAME.yml
FRAMES=""
for frame in "$CLAUDE_PROJECT_DIR"/.frames/*/FRAME.yml; do
if [ -f "$frame" ]; then
    FRAMES="$FRAMES\n$(head -2 "$frame")"
fi
done

if [ -n "$FRAMES" ]; then
jq -n --arg frames "$FRAMES" '{
    "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": ("Installed frames:\n" + $frames + "\nDiscover these frames by reading their FRAME.yml when entering a frame.")
    }
}'
fi
exit 0
