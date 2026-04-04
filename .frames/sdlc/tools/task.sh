#!/usr/bin/env bash
#
# task.sh — Task management for the SDLC frame.
#
# Usage:
#   task.sh add --role <role>        Create a task (reads JSON from stdin)
#   task.sh complete <id>            Mark a task as complete
#   task.sh get <id>                 Get a single task by ID
#   task.sh list                     List all open tasks
#   task.sh list --role <role>       List open tasks for a role
#   task.sh list --all               List all tasks including complete
#   task.sh list --all --role <role> List all tasks for a role
#
# Task JSON input (for add):
#   {
#     "title": "Short title",
#     "requester": "role-name",
#     "complexity": "haiku|sonnet|opus",
#     "overview": "Description of the work",
#     "related_items": [
#       {"ref": "path/or/url", "purpose": "why this is relevant"}
#     ],
#     "acceptance_criteria": ["criterion 1", "criterion 2"],
#     "open_questions": [
#       {"question": "What about X?", "owner": "role-name"}
#     ]
#   }
#
# Expects FRAME_ROOT to point to .frames/sdlc, or infers from script location.

set -euo pipefail

FRAME_ROOT="${FRAME_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
TASKS_FILE="$FRAME_ROOT/tasks/tasks.json"

# --- ensure tasks file exists ---

if [[ ! -f "$TASKS_FILE" ]]; then
  echo '{"next_id": 1, "tasks": []}' > "$TASKS_FILE"
fi

# --- helpers ---

# Get the next ID and increment the counter.
# Outputs the ID to stdout and writes the updated file.
next_id() {
  local id
  id="$(jq '.next_id' "$TASKS_FILE")"
  jq ".next_id = $((id + 1))" "$TASKS_FILE" > "${TASKS_FILE}.tmp" && mv "${TASKS_FILE}.tmp" "$TASKS_FILE"
  echo "$id"
}

# Validate that required fields exist in a JSON blob (passed as $1)
validate_task_input() {
  local input="$1"
  local missing=()

  for field in title requester complexity state overview acceptance_criteria; do
    if ! echo "$input" | jq -e ".$field" > /dev/null 2>&1; then
      missing+=("$field")
    fi
  done

  # Validate complexity value
  local complexity
  complexity="$(echo "$input" | jq -r '.complexity // ""')"
  if [[ -n "$complexity" && "$complexity" != "haiku" && "$complexity" != "sonnet" && "$complexity" != "opus" ]]; then
    echo "Error: complexity must be one of: haiku, sonnet, opus (got: $complexity)" >&2
    return 1
  fi

  # Validate state value
  local state
  state="$(echo "$input" | jq -r '.state // ""')"
  if [[ -n "$state" && "$state" != "design" && "$state" != "review" && "$state" != "plan" && "$state" != "build" ]]; then
    echo "Error: state must be one of: design, review, plan, build (got: $state)" >&2
    return 1
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Error: missing required fields: ${missing[*]}" >&2
    return 1
  fi
}

# --- commands ---

cmd_add() {
  local role=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --role|-r)
        role="$2"
        shift 2
        ;;
      *)
        echo "Unknown argument to add: $1" >&2
        exit 1
        ;;
    esac
  done

  if [[ -z "$role" ]]; then
    echo "Error: --role is required for add" >&2
    exit 1
  fi

  # Read JSON from stdin
  local input
  input="$(cat)"

  if [[ -z "$input" ]]; then
    echo "Error: expected JSON input on stdin" >&2
    exit 1
  fi

  # Validate
  validate_task_input "$input" || exit 1

  # Get next ID
  local id
  id="$(next_id)"

  # Build the task object
  local date_assigned
  date_assigned="$(date +%Y-%m-%d)"

  local task
  task="$(echo "$input" | jq \
    --argjson id "$id" \
    --arg role "$role" \
    --arg date "$date_assigned" \
    --arg status "open" \
    '{
      id: $id,
      role: $role,
      state: .state,
      status: $status,
      date_assigned: $date,
      title: .title,
      requester: .requester,
      complexity: .complexity,
      overview: .overview,
      related_items: (.related_items // []),
      acceptance_criteria: .acceptance_criteria,
      open_questions: (.open_questions // []),
      blocked_on: (.blocked_on // [])
    }'
  )"

  # Append to tasks array
  jq --argjson task "$task" '.tasks += [$task]' "$TASKS_FILE" > "${TASKS_FILE}.tmp" \
    && mv "${TASKS_FILE}.tmp" "$TASKS_FILE"

  # Output confirmation
  echo "$task"
}

cmd_complete() {
  local id="$1"

  if [[ -z "$id" ]]; then
    echo "Error: task ID is required" >&2
    exit 1
  fi

  # Check task exists and is open
  local current_status
  current_status="$(jq -r --argjson id "$id" '.tasks[] | select(.id == $id) | .status' "$TASKS_FILE")"

  if [[ -z "$current_status" ]]; then
    echo "Error: task #$id not found" >&2
    exit 1
  fi

  if [[ "$current_status" == "complete" ]]; then
    echo "Error: task #$id is already complete" >&2
    exit 1
  fi

  # Update status and add completion date
  local date_completed
  date_completed="$(date +%Y-%m-%d)"

  jq --argjson id "$id" --arg date "$date_completed" \
    '(.tasks[] | select(.id == $id)) |= . + {status: "complete", date_completed: $date}' \
    "$TASKS_FILE" > "${TASKS_FILE}.tmp" && mv "${TASKS_FILE}.tmp" "$TASKS_FILE"

  # Output the updated task
  jq --argjson id "$id" '.tasks[] | select(.id == $id)' "$TASKS_FILE"
}

cmd_get() {
  local id="$1"

  if [[ -z "$id" ]]; then
    echo "Error: task ID is required" >&2
    exit 1
  fi

  local task
  task="$(jq --argjson id "$id" '.tasks[] | select(.id == $id)' "$TASKS_FILE")"

  if [[ -z "$task" ]]; then
    echo "Error: task #$id not found" >&2
    exit 1
  fi

  echo "$task"
}

cmd_list() {
  local role=""
  local show_all=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --role|-r)
        role="$2"
        shift 2
        ;;
      --all|-a)
        show_all=true
        shift
        ;;
      *)
        echo "Unknown argument to list: $1" >&2
        exit 1
        ;;
    esac
  done

  local filter

  if $show_all; then
    if [[ -n "$role" ]]; then
      filter='select(.role == $role)'
    else
      filter='.'
    fi
  else
    if [[ -n "$role" ]]; then
      filter='select(.role == $role and .status == "open")'
    else
      filter='select(.status == "open")'
    fi
  fi

  if [[ -n "$role" ]]; then
    jq --arg role "$role" "[.tasks[] | $filter]" "$TASKS_FILE"
  else
    jq "[.tasks[] | $filter]" "$TASKS_FILE"
  fi
}

# --- dispatch ---

if [[ $# -eq 0 ]]; then
  echo "Usage: task.sh <add|complete|get|list> [options]" >&2
  exit 1
fi

COMMAND="$1"
shift

case "$COMMAND" in
  add)
    cmd_add "$@"
    ;;
  complete)
    cmd_complete "$@"
    ;;
  get)
    cmd_get "$@"
    ;;
  list)
    cmd_list "$@"
    ;;
  --help|-h)
    echo "Usage: task.sh <add|complete|get|list> [options]"
    echo ""
    echo "Commands:"
    echo "  add --role <role>        Create a task (reads JSON from stdin)"
    echo "  complete <id>            Mark a task as complete"
    echo "  get <id>                 Get a single task by ID"
    echo "  list [--role r] [--all]  List tasks (default: open only)"
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    exit 1
    ;;
esac
