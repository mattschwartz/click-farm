#!/usr/bin/env bash
#
# task.sh — Task management for the SDLC frame.
#
# Usage:
#   task.sh add --role <role>        Create a task (reads JSON from stdin)
#   task.sh plan                     Batch create from a plan (reads JSON array from stdin)
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

  jq --argjson id "$id" --arg date "$date_completed" '
    (.tasks[] | select(.id == $id)) |= . + {status: "complete", date_completed: $date}
    | .tasks |= [.[] | .blocked_on |= (if . then map(select(. != $id)) else [] end)]
  ' "$TASKS_FILE" > "${TASKS_FILE}.tmp" && mv "${TASKS_FILE}.tmp" "$TASKS_FILE"

  # Find tasks that were unblocked by this completion
  local unblocked
  unblocked="$(jq --argjson id "$id" '
    [.tasks[] | select(.status == "open" and (.blocked_on | length) == 0)] | map({id, title})
  ' "$TASKS_FILE")"

  # Output the completed task and any newly unblocked tasks
  local completed
  completed="$(jq --argjson id "$id" '.tasks[] | select(.id == $id)' "$TASKS_FILE")"
  jq -n --argjson completed "$completed" --argjson unblocked "$unblocked" \
    '{completed: $completed, unblocked: $unblocked}'
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

cmd_blocks() {
  # Usage: task.sh blocks <blocker_id> <blocked_id> [<blocked_id>...]
  # Reads as: "task <blocker_id> blocks these tasks"
  # Adds <blocker_id> to the blocked_on array of each <blocked_id>.

  if [[ $# -lt 2 ]]; then
    echo "Usage: task.sh blocks <blocker_id> <blocked_id> [<blocked_id>...]" >&2
    echo "  Marks <blocker_id> as a blocker on each of the listed tasks." >&2
    exit 1
  fi

  local blocker="$1"
  shift
  local blocked=("$@")

  # Numeric check
  if ! [[ "$blocker" =~ ^[0-9]+$ ]]; then
    echo "Error: blocker ID must be a number, got '$blocker'" >&2
    exit 1
  fi
  for id in "${blocked[@]}"; do
    if ! [[ "$id" =~ ^[0-9]+$ ]]; then
      echo "Error: blocked ID must be a number, got '$id'" >&2
      exit 1
    fi
    if [[ "$id" == "$blocker" ]]; then
      echo "Error: a task cannot block itself (#$id)" >&2
      exit 1
    fi
  done

  # Build a JSON array of the blocked IDs for jq
  local blocked_json
  blocked_json="$(printf '%s\n' "${blocked[@]}" | jq -s 'map(tonumber)')"

  # Verify blocker exists
  local blocker_exists
  blocker_exists="$(jq --argjson id "$blocker" '[.tasks[] | select(.id == $id)] | length' "$TASKS_FILE")"
  if [[ "$blocker_exists" == "0" ]]; then
    echo "Error: blocker task #$blocker not found" >&2
    exit 1
  fi

  # Verify all blocked tasks exist
  local missing
  missing="$(jq -r --argjson ids "$blocked_json" '
    ($ids - [.tasks[].id]) | .[]
  ' "$TASKS_FILE")"
  if [[ -n "$missing" ]]; then
    echo "Error: task(s) not found: $missing" >&2
    exit 1
  fi

  # Append blocker ID to blocked_on of each listed task (dedup with unique)
  jq --argjson blocker "$blocker" --argjson ids "$blocked_json" '
    .tasks |= [.[] | if (.id as $tid | $ids | index($tid)) != null
                      then .blocked_on = ((.blocked_on // []) + [$blocker] | unique)
                      else . end]
  ' "$TASKS_FILE" > "${TASKS_FILE}.tmp" && mv "${TASKS_FILE}.tmp" "$TASKS_FILE"

  # Human-readable confirmation
  local blocked_list
  blocked_list="$(printf '#%s, ' "${blocked[@]}" | sed 's/, $//')"
  echo "Task #$blocker now blocks: $blocked_list"
}

cmd_plan() {
  # Read JSON array from stdin
  local input
  input="$(cat)"

  if [[ -z "$input" ]]; then
    echo "Error: expected JSON array on stdin" >&2
    exit 1
  fi

  # Verify it's an array
  local count
  count="$(echo "$input" | jq 'length')" || {
    echo "Error: invalid JSON" >&2
    exit 1
  }

  if [[ "$(echo "$input" | jq 'type')" != '"array"' ]]; then
    echo "Error: expected JSON array, got $(echo "$input" | jq 'type')" >&2
    exit 1
  fi

  if [[ "$count" -eq 0 ]]; then
    echo "Error: plan is empty" >&2
    exit 1
  fi

  # --- pass 1: validate all tasks and check for duplicate aliases ---

  local aliases=()
  for i in $(seq 0 $((count - 1))); do
    local task_input
    task_input="$(echo "$input" | jq ".[$i]")"

    # Check required fields (including role and alias for plan)
    local missing=()
    for field in alias role title requester complexity state overview acceptance_criteria; do
      if ! echo "$task_input" | jq -e ".$field" > /dev/null 2>&1; then
        missing+=("$field")
      fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
      local alias_hint
      alias_hint="$(echo "$task_input" | jq -r '.alias // "unknown"')"
      echo "Error: task $alias_hint (index $i) missing required fields: ${missing[*]}" >&2
      exit 1
    fi

    local alias
    alias="$(echo "$task_input" | jq -r '.alias')"

    # Check for duplicate aliases
    for existing in "${aliases[@]+"${aliases[@]}"}"; do
      if [[ "$existing" == "$alias" ]]; then
        echo "Error: duplicate alias '$alias'" >&2
        exit 1
      fi
    done
    aliases+=("$alias")
  done

  # --- pass 1.5: build alias→ID map as JSON, assign IDs ---

  local start_id
  start_id="$(jq '.next_id' "$TASKS_FILE")"

  # Build the map in one jq call: {"A1": 3, "A2": 4, "E1": 5, ...}
  local alias_map
  alias_map="$(echo "$input" | jq --argjson start "$start_id" '
    [to_entries[] | {(.value.alias): ($start + .key)}] | add
  ')"

  # Validate all blocked_on references resolve
  local bad_refs
  bad_refs="$(echo "$input" | jq -r --argjson map "$alias_map" '
    .[] | .alias as $src | (.blocked_on // [])[] |
    select($map[.] == null) |
    "\($src) -> \(.)"
  ')"

  if [[ -n "$bad_refs" ]]; then
    echo "Error: unresolved blocked_on references:" >&2
    echo "$bad_refs" >&2
    exit 1
  fi

  # --- pass 2: create all tasks, resolving aliases to IDs (all in jq) ---

  local date_assigned
  date_assigned="$(date +%Y-%m-%d)"

  local created_tasks
  created_tasks="$(echo "$input" | jq --argjson map "$alias_map" --arg date "$date_assigned" '
    [to_entries[] | .value as $t | {
      id: $map[$t.alias],
      alias: $t.alias,
      role: $t.role,
      state: $t.state,
      status: "open",
      date_assigned: $date,
      title: $t.title,
      requester: $t.requester,
      complexity: $t.complexity,
      overview: $t.overview,
      related_items: ($t.related_items // []),
      acceptance_criteria: $t.acceptance_criteria,
      open_questions: ($t.open_questions // []),
      blocked_on: [($t.blocked_on // [])[] | $map[.]]
    }]
  ')"

  # Write all tasks to the file atomically
  local new_next_id=$((start_id + count))
  jq --argjson tasks "$created_tasks" --argjson next "$new_next_id" \
    '.tasks += $tasks | .next_id = $next' \
    "$TASKS_FILE" > "${TASKS_FILE}.tmp" && mv "${TASKS_FILE}.tmp" "$TASKS_FILE"

  # Output all created tasks
  echo "$created_tasks" | jq '.'
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
  plan)
    cmd_plan "$@"
    ;;
  blocks)
    cmd_blocks "$@"
    ;;
  --help|-h)
    echo "Usage: task.sh <add|complete|get|list|plan> [options]"
    echo ""
    echo "Commands:"
    echo "  add --role <role>        Create a task (reads JSON from stdin)"
    echo "  complete <id>            Mark a task as complete"
    echo "  get <id>                 Get a single task by ID"
    echo "  list [--role r] [--all]  List tasks (default: open only)"
    echo "  plan                     Batch create tasks from a plan (reads JSON array from stdin)"
    echo "  blocks <id> <id>...      Mark first task as a blocker on all remaining tasks"
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    exit 1
    ;;
esac
