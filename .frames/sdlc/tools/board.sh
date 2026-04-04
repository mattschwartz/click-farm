#!/usr/bin/env bash
#
# board.sh — Project board for the SDLC frame.
# Shows proposals, tasks, and project state.
#
# Usage:
#   board.sh                          JSON summary (all roles)
#   board.sh --role <role>            JSON detail for a specific role
#   board.sh --pretty-print           Human-readable summary
#   board.sh --pretty-print -r <role> Human-readable detail for a role
#
# Expects to be run from the repo root, or with FRAME_ROOT set to
# the .frames/sdlc directory.

set -euo pipefail

FRAME_ROOT="${FRAME_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
PROPOSALS_DIR="$FRAME_ROOT/proposals"
TASKS_DIR="$FRAME_ROOT/tasks"

ROLE=""
PRETTY=false

# --- argument parsing ---

while [[ $# -gt 0 ]]; do
  case "$1" in
    --role|-r)
      ROLE="$2"
      shift 2
      ;;
    --pretty-print|-p)
      PRETTY=true
      shift
      ;;
    --help|-h)
      echo "Usage: board.sh [--role <role>] [--pretty-print]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# --- helpers ---

# Escape a string for JSON output
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

# Read a frontmatter field from a markdown file.
fm_field() {
  local file="$1" field="$2"
  sed -n '/^---$/,/^---$/p' "$file" \
    | grep "^${field}:" \
    | head -1 \
    | sed "s/^${field}:[[:space:]]*//"
}

# Count work orders in a task file.
task_count() {
  local file="$1"
  if [[ ! -s "$file" ]]; then
    echo 0
    return
  fi
  local n
  n="$(grep -c '^# Work Order:' "$file" 2>/dev/null)" || true
  echo "${n:-0}"
}

# Extract task titles from a task file.
task_titles() {
  local file="$1"
  grep '^# Work Order:' "$file" 2>/dev/null | sed 's/^# Work Order:[[:space:]]*//'
}

# Extract a single task block by title.
task_detail() {
  local file="$1" title="$2"
  awk -v title="$title" '
    BEGIN { found=0 }
    /^# Work Order:/ {
      if (found) exit
      if (index($0, title) > 0) found=1
    }
    found { print }
    /^---$/ && found && NR>1 { exit }
  ' "$file"
}

# Parse key fields from a task block (passed via stdin)
task_field() {
  local field="$1"
  grep "^\*\*${field}\*\*:" | head -1 | sed "s/^\*\*${field}\*\*:[[:space:]]*//"
}

# Check if a proposal has open questions
has_open_questions() {
  local file="$1"
  local n
  n="$(awk '
    /^## Open Questions/ { inside=1; next }
    /^(## |---$)/ && inside { exit }
    inside && /^[0-9]+\./ { count++ }
    END { print count+0 }
  ' "$file")"
  [[ "$n" -gt 0 ]]
}

# Extract review decisions from a proposal
review_decisions() {
  local file="$1"
  awk '
    /^# Review:/ {
      gsub(/^# Review:[[:space:]]*/, "")
      role=$0
    }
    /^\*\*Decision\*\*:/ {
      gsub(/.*\*\*Decision\*\*:[[:space:]]*/, "")
      print role "|" $0
    }
  ' "$file"
}

# Collect acceptance criteria lines from a task block (passed via stdin)
task_criteria() {
  awk '
    /^## Acceptance Criteria/ { inside=1; next }
    /^## / && inside { exit }
    inside && /^[0-9]+\./ {
      sub(/^[0-9]+\.[[:space:]]*/, "")
      print
    }
  '
}

# Collect open questions from a task block (passed via stdin)
task_open_questions_text() {
  awk '
    /^## Open Questions/ { inside=1; next }
    /^## / && inside { exit }
    /^---$/ && inside { exit }
    inside && /[^ ]/ { print }
  '
}

# Find OQs owned by a specific role in a proposal
oqs_for_role() {
  local file="$1" role="$2"
  awk -v role="$role" '
    /^## Open Questions/ { inside=1; next }
    /^## / && inside { exit }
    /^---$/ && inside { exit }
    inside && /^[0-9]+\./ && tolower($0) ~ role { print }
  ' "$file"
}

# --- gather data ---

ROLES=()
if [[ -d "$TASKS_DIR" ]]; then
  for f in "$TASKS_DIR"/*.md; do
    [[ -f "$f" ]] || continue
    ROLES+=("$(basename "$f" .md)")
  done
fi

declare -a PROP_FILES=()
declare -a PROP_STATUSES=()
for status_dir in draft accepted rejected; do
  dir="$PROPOSALS_DIR/$status_dir"
  [[ -d "$dir" ]] || continue
  for f in "$dir"/*.md; do
    [[ -f "$f" ]] || continue
    PROP_FILES+=("$f")
    PROP_STATUSES+=("$status_dir")
  done
done

# ============================================================
# JSON OUTPUT
# ============================================================

json_summary() {
  echo '{'

  # proposals
  echo '  "proposals": ['
  local first=true
  for i in "${!PROP_FILES[@]}"; do
    local f="${PROP_FILES[$i]}"
    local status="${PROP_STATUSES[$i]}"
    local name="$(fm_field "$f" "name")"
    local author="$(fm_field "$f" "author")"
    local reviewers_raw="$(fm_field "$f" "reviewers" | tr -d '[]' | sed 's/,  */, /g' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    local has_oq=false
    has_open_questions "$f" && has_oq=true

    $first || echo ','
    first=false
    printf '    {'
    printf '"name": "%s"' "$(json_escape "$name")"
    printf ', "status": "%s"' "$status"
    printf ', "author": "%s"' "$author"
    if [[ -n "$reviewers_raw" ]]; then
      # Build reviewers array
      printf ', "reviewers": ['
      local rfirst=true
      IFS=', ' read -ra revs <<< "$reviewers_raw"
      for r in "${revs[@]}"; do
        [[ -z "$r" ]] && continue
        $rfirst || printf ', '
        rfirst=false
        printf '"%s"' "$r"
      done
      printf ']'
    else
      printf ', "reviewers": []'
    fi
    printf ', "has_open_questions": %s' "$has_oq"

    # reviews
    local revdecs="$(review_decisions "$f")"
    if [[ -n "$revdecs" ]]; then
      printf ', "reviews": {'
      local dfirst=true
      while IFS='|' read -r rrole rdec; do
        $dfirst || printf ', '
        dfirst=false
        printf '"%s": "%s"' "$(json_escape "$rrole")" "$(json_escape "$rdec")"
      done <<< "$revdecs"
      printf '}'
    fi

    printf '}'
  done
  echo ''
  echo '  ],'

  # tasks
  echo '  "tasks": {'
  local tfirst=true
  for role in "${ROLES[@]}"; do
    local file="$TASKS_DIR/${role}.md"
    local count="$(task_count "$file")"
    $tfirst || echo ','
    tfirst=false
    printf '    "%s": [' "$role"
    if [[ "$count" -gt 0 ]]; then
      local titles="$(task_titles "$file")"
      local ifirst=true
      while IFS= read -r title; do
        $ifirst || printf ', '
        ifirst=false
        printf '"%s"' "$(json_escape "$title")"
      done <<< "$titles"
    fi
    printf ']'
  done
  echo ''
  echo '  }'

  echo '}'
}

json_role() {
  local ROLE="$1"
  local ROLE_FILE="$TASKS_DIR/${ROLE}.md"
  if [[ ! -f "$ROLE_FILE" ]]; then
    echo '{"error": "Unknown role: '"$ROLE"'"}' >&2
    exit 1
  fi

  echo '{'
  printf '  "role": "%s",\n' "$ROLE"

  # tasks
  echo '  "tasks": ['
  local count="$(task_count "$ROLE_FILE")"
  if [[ "$count" -gt 0 ]]; then
    local titles="$(task_titles "$ROLE_FILE")"
    local tfirst=true
    while IFS= read -r title; do
      $tfirst || echo ','
      tfirst=false
      local block="$(task_detail "$ROLE_FILE" "$title")"
      local requester="$(echo "$block" | task_field "Requester")"
      local complexity="$(echo "$block" | task_field "Complexity")"
      local date_assigned="$(echo "$block" | task_field "Date Assigned")"
      local criteria_lines="$(echo "$block" | task_criteria)"
      local oq_text="$(echo "$block" | task_open_questions_text)"

      printf '    {'
      printf '"title": "%s"' "$(json_escape "$title")"
      printf ', "requester": "%s"' "$(json_escape "$requester")"
      printf ', "complexity": "%s"' "$(json_escape "$complexity")"
      printf ', "date_assigned": "%s"' "$(json_escape "$date_assigned")"

      # criteria array
      printf ', "acceptance_criteria": ['
      local cfirst=true
      if [[ -n "$criteria_lines" ]]; then
        while IFS= read -r line; do
          $cfirst || printf ', '
          cfirst=false
          printf '"%s"' "$(json_escape "$line")"
        done <<< "$criteria_lines"
      fi
      printf ']'

      # open questions
      local has_oq=false
      if [[ -n "$oq_text" && "$oq_text" != "None"* ]]; then
        has_oq=true
      fi
      printf ', "has_open_questions": %s' "$has_oq"

      printf '}'
    done <<< "$titles"
  fi
  echo ''
  echo '  ],'

  # proposals authored
  echo '  "proposals_authored": ['
  local afirst=true
  for i in "${!PROP_FILES[@]}"; do
    local f="${PROP_FILES[$i]}"
    local status="${PROP_STATUSES[$i]}"
    local author="$(fm_field "$f" "author")"
    if [[ "$author" == "$ROLE" ]]; then
      $afirst || echo ','
      afirst=false
      local name="$(fm_field "$f" "name")"
      local reviewers_raw="$(fm_field "$f" "reviewers" | tr -d '[]' | sed 's/,  */, /g' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
      local has_oq=false
      has_open_questions "$f" && has_oq=true

      printf '    {'
      printf '"name": "%s"' "$(json_escape "$name")"
      printf ', "status": "%s"' "$status"
      if [[ -n "$reviewers_raw" ]]; then
        printf ', "reviewers": ['
        local rfirst=true
        IFS=', ' read -ra revs <<< "$reviewers_raw"
        for r in "${revs[@]}"; do
          [[ -z "$r" ]] && continue
          $rfirst || printf ', '
          rfirst=false
          printf '"%s"' "$r"
        done
        printf ']'
      else
        printf ', "reviewers": []'
      fi
      printf ', "has_open_questions": %s' "$has_oq"

      local revdecs="$(review_decisions "$f")"
      if [[ -n "$revdecs" ]]; then
        printf ', "reviews": {'
        local dfirst=true
        while IFS='|' read -r rrole rdec; do
          $dfirst || printf ', '
          dfirst=false
          printf '"%s": "%s"' "$(json_escape "$rrole")" "$(json_escape "$rdec")"
        done <<< "$revdecs"
        printf '}'
      fi

      printf '}'
    fi
  done
  echo ''
  echo '  ],'

  # proposals awaiting review
  echo '  "proposals_to_review": ['
  local rfirst=true
  for i in "${!PROP_FILES[@]}"; do
    local f="${PROP_FILES[$i]}"
    local status="${PROP_STATUSES[$i]}"
    local reviewers="$(fm_field "$f" "reviewers")"
    if echo "$reviewers" | grep -q "$ROLE"; then
      $rfirst || echo ','
      rfirst=false
      local name="$(fm_field "$f" "name")"
      local author="$(fm_field "$f" "author")"
      local has_oq=false
      has_open_questions "$f" && has_oq=true

      printf '    {'
      printf '"name": "%s"' "$(json_escape "$name")"
      printf ', "status": "%s"' "$status"
      printf ', "author": "%s"' "$author"
      printf ', "has_open_questions": %s' "$has_oq"

      # OQs assigned to this role
      local my_oqs="$(oqs_for_role "$f" "$ROLE")"
      if [[ -n "$my_oqs" ]]; then
        printf ', "your_open_questions": ['
        local qfirst=true
        while IFS= read -r line; do
          $qfirst || printf ', '
          qfirst=false
          printf '"%s"' "$(json_escape "$line")"
        done <<< "$my_oqs"
        printf ']'
      fi

      printf '}'
    fi
  done
  echo ''
  echo '  ]'

  echo '}'
}

# ============================================================
# PRETTY-PRINT OUTPUT
# ============================================================

pretty_summary() {
  echo "===================================="
  echo "  PROJECT BOARD"
  echo "===================================="
  echo ""

  echo "PROPOSALS"
  echo "------------------------------------"
  if [[ ${#PROP_FILES[@]} -eq 0 ]]; then
    echo "  (none)"
  else
    for i in "${!PROP_FILES[@]}"; do
      local f="${PROP_FILES[$i]}"
      local status="${PROP_STATUSES[$i]}"
      local name="$(fm_field "$f" "name")"
      local author="$(fm_field "$f" "author")"
      local reviewers="$(fm_field "$f" "reviewers")"
      local reviewers_clean="$(echo "$reviewers" | tr -d '[]' | sed 's/,  */, /g')"

      printf "  %-10s %s\n" "$status" "$name"
      printf "             author: %s" "$author"
      if [[ -n "$reviewers_clean" && "$reviewers_clean" != "" ]]; then
        printf "  |  reviewing: %s" "$reviewers_clean"
      fi
      if has_open_questions "$f"; then
        printf "  |  has open questions"
      fi
      echo ""
    done
  fi

  echo ""

  echo "TASKS"
  echo "------------------------------------"
  for role in "${ROLES[@]}"; do
    local file="$TASKS_DIR/${role}.md"
    local count="$(task_count "$file")"
    if [[ "$count" -eq 0 ]]; then
      printf "  %-18s %s\n" "$role" "(no tasks)"
    else
      local titles="$(task_titles "$file")"
      printf "  %-18s %s task(s)\n" "$role" "$count"
      while IFS= read -r title; do
        echo "                     - $title"
      done <<< "$titles"
    fi
  done
  echo ""
}

pretty_role() {
  local ROLE="$1"
  local ROLE_FILE="$TASKS_DIR/${ROLE}.md"
  if [[ ! -f "$ROLE_FILE" ]]; then
    echo "Unknown role: $ROLE" >&2
    echo "Available roles: ${ROLES[*]}" >&2
    exit 1
  fi

  echo "===================================="
  echo "  BOARD: $ROLE"
  echo "===================================="
  echo ""

  echo "YOUR TASKS"
  echo "------------------------------------"
  local count="$(task_count "$ROLE_FILE")"
  if [[ "$count" -eq 0 ]]; then
    echo "  (no tasks)"
  else
    local titles="$(task_titles "$ROLE_FILE")"
    while IFS= read -r title; do
      local block="$(task_detail "$ROLE_FILE" "$title")"
      local requester="$(echo "$block" | task_field "Requester")"
      local complexity="$(echo "$block" | task_field "Complexity")"
      local date_assigned="$(echo "$block" | task_field "Date Assigned")"
      local criteria="$(echo "$block" | task_criteria)"
      local open_qs="$(echo "$block" | task_open_questions_text)"

      echo "  $title"
      echo "    Requester: $requester  |  Complexity: $complexity  |  Assigned: $date_assigned"

      if [[ -n "$criteria" ]]; then
        echo "    Criteria:"
        while IFS= read -r line; do
          echo "      $line"
        done <<< "$criteria"
      fi

      if [[ -n "$open_qs" && "$open_qs" != "None"* ]]; then
        echo "    Open questions:"
        while IFS= read -r line; do
          echo "      $line"
        done <<< "$open_qs"
      fi
      echo ""
    done <<< "$titles"
  fi

  echo "PROPOSALS YOU AUTHORED"
  echo "------------------------------------"
  local found=0
  for i in "${!PROP_FILES[@]}"; do
    local f="${PROP_FILES[$i]}"
    local status="${PROP_STATUSES[$i]}"
    local author="$(fm_field "$f" "author")"
    if [[ "$author" == "$ROLE" ]]; then
      found=1
      local name="$(fm_field "$f" "name")"
      local reviewers="$(fm_field "$f" "reviewers" | tr -d '[]' | sed 's/,  */, /g')"

      printf "  %-10s %s\n" "$status" "$name"
      if [[ -n "$reviewers" && "$reviewers" != "" ]]; then
        echo "    Awaiting review from: $reviewers"
      fi
      if has_open_questions "$f"; then
        echo "    Has open questions"
      fi

      local reviews="$(review_decisions "$f")"
      if [[ -n "$reviews" ]]; then
        echo "    Reviews:"
        while IFS='|' read -r rrole rdec; do
          echo "      $rrole: $rdec"
        done <<< "$reviews"
      fi
      echo ""
    fi
  done
  if [[ $found -eq 0 ]]; then
    echo "  (none)"
    echo ""
  fi

  echo "PROPOSALS AWAITING YOUR REVIEW"
  echo "------------------------------------"
  found=0
  for i in "${!PROP_FILES[@]}"; do
    local f="${PROP_FILES[$i]}"
    local status="${PROP_STATUSES[$i]}"
    local reviewers="$(fm_field "$f" "reviewers")"
    if echo "$reviewers" | grep -q "$ROLE"; then
      found=1
      local name="$(fm_field "$f" "name")"
      local author="$(fm_field "$f" "author")"
      echo "  $name"
      printf "    Status: %s  |  Author: %s" "$status" "$author"
      if has_open_questions "$f"; then
        printf "  |  has open questions"
      fi
      echo ""

      local my_oqs="$(oqs_for_role "$f" "$ROLE")"
      if [[ -n "$my_oqs" ]]; then
        echo "    Questions for you:"
        while IFS= read -r line; do
          echo "      $line"
        done <<< "$my_oqs"
      fi
      echo ""
    fi
  done
  if [[ $found -eq 0 ]]; then
    echo "  (none)"
    echo ""
  fi
}

# ============================================================
# DISPATCH
# ============================================================

if $PRETTY; then
  if [[ -z "$ROLE" ]]; then
    pretty_summary
  else
    pretty_role "$ROLE"
  fi
else
  if [[ -z "$ROLE" ]]; then
    json_summary
  else
    json_role "$ROLE"
  fi
fi
