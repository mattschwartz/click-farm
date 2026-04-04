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
TASKS_FILE="$FRAME_ROOT/tasks/tasks.json"

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

# --- ensure tasks file exists ---

if [[ ! -f "$TASKS_FILE" ]]; then
  echo '{"next_id": 1, "tasks": []}' > "$TASKS_FILE"
fi

# --- proposal helpers ---

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

# Check if a proposal has open questions
has_open_questions() {
  local file="$1"
  local n
  n="$(awk '
    /^## Open Questions/ { inside=1; next }
    /^(## |---$)/ && inside { exit }
    inside && /^[0-9]+\./ && !/\[RESOLVED\]/ { count++ }
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

# Find OQs owned by a specific role in a proposal
oqs_for_role() {
  local file="$1" role="$2"
  awk -v role="$role" '
    /^## Open Questions/ { inside=1; next }
    /^## / && inside { exit }
    /^---$/ && inside { exit }
    inside && /^[0-9]+\./ && !/\[RESOLVED\]/ && tolower($0) ~ role { print }
  ' "$file"
}

# --- gather data ---

# Proposals — scan draft, accepted, rejected directories
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

# Roles — derived from tasks.json
ROLES=($(jq -r '[.tasks[].role] | unique | .[]' "$TASKS_FILE" 2>/dev/null))

# ============================================================
# JSON OUTPUT
# ============================================================

json_summary() {
  # Build proposals JSON with bash for the markdown parsing,
  # then merge with tasks from tasks.json via jq

  # --- proposals ---
  local proposals_json="["
  local first=true
  for i in "${!PROP_FILES[@]}"; do
    local f="${PROP_FILES[$i]}"
    local status="${PROP_STATUSES[$i]}"
    local name="$(fm_field "$f" "name")"
    local author="$(fm_field "$f" "author")"
    local reviewers_raw="$(fm_field "$f" "reviewers" | tr -d '[]' | sed 's/,  */, /g' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
    local has_oq=false
    has_open_questions "$f" && has_oq=true

    $first || proposals_json+=","
    first=false

    local prop='{'
    prop+="\"name\": \"$(json_escape "$name")\""
    prop+=", \"status\": \"$status\""
    prop+=", \"author\": \"$author\""

    # reviewers array
    prop+=', "reviewers": ['
    if [[ -n "$reviewers_raw" ]]; then
      local rfirst=true
      IFS=', ' read -ra revs <<< "$reviewers_raw"
      for r in "${revs[@]}"; do
        [[ -z "$r" ]] && continue
        $rfirst || prop+=", "
        rfirst=false
        prop+="\"$r\""
      done
    fi
    prop+=']'

    prop+=", \"has_open_questions\": $has_oq"

    # reviews
    local revdecs="$(review_decisions "$f")"
    if [[ -n "$revdecs" ]]; then
      prop+=', "reviews": {'
      local dfirst=true
      while IFS='|' read -r rrole rdec; do
        $dfirst || prop+=", "
        dfirst=false
        prop+="\"$(json_escape "$rrole")\": \"$(json_escape "$rdec")\""
      done <<< "$revdecs"
      prop+='}'
    fi

    prop+='}'
    proposals_json+="$prop"
  done
  proposals_json+="]"

  # --- tasks: group open tasks by role from tasks.json ---
  local tasks_json
  tasks_json="$(jq '
    [.tasks[] | select(.status == "open")]
    | group_by(.role)
    | map({(.[0].role): [.[] | {id: .id, title: .title, complexity: .complexity, state: .state} + (if (.blocked_on | length) > 0 then {blocked_on: .blocked_on} else {} end)]})
    | add // {}
  ' "$TASKS_FILE")"

  # --- combine ---
  jq -n \
    --argjson proposals "$proposals_json" \
    --argjson tasks "$tasks_json" \
    '{proposals: $proposals, tasks: $tasks}'
}

json_role() {
  local role="$1"

  # Get tasks for this role from tasks.json
  local tasks_json
  tasks_json="$(jq --arg role "$role" '
    [.tasks[] | select(.role == $role and .status == "open")]
  ' "$TASKS_FILE")"

  # proposals authored
  local authored_json="["
  local afirst=true
  for i in "${!PROP_FILES[@]}"; do
    local f="${PROP_FILES[$i]}"
    local status="${PROP_STATUSES[$i]}"
    local author="$(fm_field "$f" "author")"
    if [[ "$author" == "$role" ]]; then
      $afirst || authored_json+=","
      afirst=false
      local name="$(fm_field "$f" "name")"
      local reviewers_raw="$(fm_field "$f" "reviewers" | tr -d '[]' | sed 's/,  */, /g' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
      local has_oq=false
      has_open_questions "$f" && has_oq=true

      local prop='{'
      prop+="\"name\": \"$(json_escape "$name")\""
      prop+=", \"status\": \"$status\""
      prop+=', "reviewers": ['
      if [[ -n "$reviewers_raw" ]]; then
        local rfirst=true
        IFS=', ' read -ra revs <<< "$reviewers_raw"
        for r in "${revs[@]}"; do
          [[ -z "$r" ]] && continue
          $rfirst || prop+=", "
          rfirst=false
          prop+="\"$r\""
        done
      fi
      prop+=']'
      prop+=", \"has_open_questions\": $has_oq"

      local revdecs="$(review_decisions "$f")"
      if [[ -n "$revdecs" ]]; then
        prop+=', "reviews": {'
        local dfirst=true
        while IFS='|' read -r rrole rdec; do
          $dfirst || prop+=", "
          dfirst=false
          prop+="\"$(json_escape "$rrole")\": \"$(json_escape "$rdec")\""
        done <<< "$revdecs"
        prop+='}'
      fi

      prop+='}'
      authored_json+="$prop"
    fi
  done
  authored_json+="]"

  # proposals to review
  local review_json="["
  local rvfirst=true
  for i in "${!PROP_FILES[@]}"; do
    local f="${PROP_FILES[$i]}"
    local status="${PROP_STATUSES[$i]}"
    local reviewers="$(fm_field "$f" "reviewers")"
    if echo "$reviewers" | grep -q "$role"; then
      $rvfirst || review_json+=","
      rvfirst=false
      local name="$(fm_field "$f" "name")"
      local author="$(fm_field "$f" "author")"
      local has_oq=false
      has_open_questions "$f" && has_oq=true

      local prop='{'
      prop+="\"name\": \"$(json_escape "$name")\""
      prop+=", \"status\": \"$status\""
      prop+=", \"author\": \"$author\""
      prop+=", \"has_open_questions\": $has_oq"

      local my_oqs="$(oqs_for_role "$f" "$role")"
      if [[ -n "$my_oqs" ]]; then
        prop+=', "your_open_questions": ['
        local qfirst=true
        while IFS= read -r line; do
          $qfirst || prop+=", "
          qfirst=false
          prop+="\"$(json_escape "$line")\""
        done <<< "$my_oqs"
        prop+=']'
      fi

      prop+='}'
      review_json+="$prop"
    fi
  done
  review_json+="]"

  # combine
  jq -n \
    --arg role "$role" \
    --argjson tasks "$tasks_json" \
    --argjson authored "$authored_json" \
    --argjson to_review "$review_json" \
    '{role: $role, tasks: $tasks, proposals_authored: $authored, proposals_to_review: $to_review}'
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
  # Read open tasks grouped by role from tasks.json
  local roles_with_tasks
  roles_with_tasks="$(jq -r '[.tasks[] | select(.status == "open") | .role] | unique | .[]' "$TASKS_FILE" 2>/dev/null)"

  if [[ -z "$roles_with_tasks" ]]; then
    echo "  (no tasks)"
  else
    while IFS= read -r role; do
      local count
      count="$(jq --arg r "$role" '[.tasks[] | select(.role == $r and .status == "open")] | length' "$TASKS_FILE")"
      printf "  %-18s %s task(s)\n" "$role" "$count"
      jq -r --arg r "$role" '.tasks[] | select(.role == $r and .status == "open") | "                     #\(.id)  \(.title)"' "$TASKS_FILE"
    done <<< "$roles_with_tasks"
  fi
  echo ""
}

pretty_role() {
  local role="$1"

  echo "===================================="
  echo "  BOARD: $role"
  echo "===================================="
  echo ""

  echo "YOUR TASKS"
  echo "------------------------------------"
  local count
  count="$(jq --arg r "$role" '[.tasks[] | select(.role == $r and .status == "open")] | length' "$TASKS_FILE")"

  if [[ "$count" -eq 0 ]]; then
    echo "  (no tasks)"
  else
    # Print each task with detail
    jq -r --arg r "$role" '
      .tasks[] | select(.role == $r and .status == "open") |
      "  #\(.id)  \(.title)",
      "    Requester: \(.requester)  |  Complexity: \(.complexity)  |  Assigned: \(.date_assigned)",
      (if (.acceptance_criteria | length) > 0 then
        "    Criteria:",
        (.acceptance_criteria | to_entries[] | "      \(.value)")
      else empty end),
      (if (.open_questions | length) > 0 then
        "    Open questions:",
        (.open_questions[] | "      [\(.owner)] \(.question)")
      else empty end),
      ""
    ' "$TASKS_FILE"
  fi

  echo "PROPOSALS YOU AUTHORED"
  echo "------------------------------------"
  local found=0
  for i in "${!PROP_FILES[@]}"; do
    local f="${PROP_FILES[$i]}"
    local status="${PROP_STATUSES[$i]}"
    local author="$(fm_field "$f" "author")"
    if [[ "$author" == "$role" ]]; then
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
    if echo "$reviewers" | grep -q "$role"; then
      found=1
      local name="$(fm_field "$f" "name")"
      local author="$(fm_field "$f" "author")"
      echo "  $name"
      printf "    Status: %s  |  Author: %s" "$status" "$author"
      if has_open_questions "$f"; then
        printf "  |  has open questions"
      fi
      echo ""

      local my_oqs="$(oqs_for_role "$f" "$role")"
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
