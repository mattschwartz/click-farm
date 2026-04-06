#!/usr/bin/env bash
# accessibility-checker.sh — WCAG contrast and color-distance checks.
#
# Usage:
#   bash .frames/sdlc/tools/accessibility-checker.sh contrast <fg-hex> <bg-hex>
#   bash .frames/sdlc/tools/accessibility-checker.sh ramp <bg-hex> <hex1> <hex2> ... <hexN>
#   bash .frames/sdlc/tools/accessibility-checker.sh distance <hex1> <hex2>
#   bash .frames/sdlc/tools/accessibility-checker.sh palette <bg-hex> --file <path>
#
# Commands:
#   contrast   Check a single foreground/background pair. Reports ratio and
#              pass/fail for AA text (4.5:1), AA large text (3:1), and AAA (7:1).
#
#   ramp       Check a list of foreground colors against one background. Useful
#              for validating a full color ramp (e.g., tier suffix colors).
#              Reports a table with ratio + pass/fail for each.
#
#   distance   Compute perceptual distance between two colors using CIE76 ΔE.
#              Useful for checking whether two colors are visually distinct.
#              Rule of thumb: ΔE < 1 = imperceptible, < 5 = close, > 10 = distinct.
#
#   palette    Like ramp, but reads hex colors from a file (one per line, # comments ok).
#
# All hex values accept 3-digit (#ABC) or 6-digit (#AABBCC) format, with or
# without the leading #.
#
# Examples:
#   bash .frames/sdlc/tools/accessibility-checker.sh contrast "#6E6E6E" "#FAF8F5"
#   bash .frames/sdlc/tools/accessibility-checker.sh ramp "#FAF8F5" "#6E6E6E" "#5B748A" "#3E6B8F"
#   bash .frames/sdlc/tools/accessibility-checker.sh distance "#B00840" "#B71C1C"

set -euo pipefail

# ---------------------------------------------------------------------------
# Hex parsing
# ---------------------------------------------------------------------------

parse_hex() {
  local hex="$1"
  hex="${hex#\#}" # strip leading #

  # Expand 3-digit shorthand
  if [[ ${#hex} -eq 3 ]]; then
    local r="${hex:0:1}" g="${hex:1:1}" b="${hex:2:1}"
    hex="${r}${r}${g}${g}${b}${b}"
  fi

  if [[ ${#hex} -ne 6 ]]; then
    echo "Error: invalid hex color '$1' — expected #RGB or #RRGGBB" >&2
    exit 1
  fi

  echo "$hex"
}

hex_to_rgb() {
  local hex
  hex=$(parse_hex "$1")
  local r=$((16#${hex:0:2}))
  local g=$((16#${hex:2:2}))
  local b=$((16#${hex:4:2}))
  echo "$r $g $b"
}

# ---------------------------------------------------------------------------
# WCAG 2.1 relative luminance + contrast ratio
# Uses awk for the sRGB linearization (gamma 2.4 transfer function).
# ---------------------------------------------------------------------------

relative_luminance() {
  local rgb
  rgb=$(hex_to_rgb "$1")
  local r g b
  read -r r g b <<< "$rgb"
  awk -v r="$r" -v g="$g" -v b="$b" 'BEGIN {
    rs = r / 255.0
    gs = g / 255.0
    bs = b / 255.0
    rl = (rs <= 0.04045) ? rs / 12.92 : ((rs + 0.055) / 1.055) ^ 2.4
    gl = (gs <= 0.04045) ? gs / 12.92 : ((gs + 0.055) / 1.055) ^ 2.4
    bl = (bs <= 0.04045) ? bs / 12.92 : ((bs + 0.055) / 1.055) ^ 2.4
    printf "%.6f\n", 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
  }'
}

contrast_ratio() {
  local l1 l2
  l1=$(relative_luminance "$1")
  l2=$(relative_luminance "$2")
  awk -v a="$l1" -v b="$l2" 'BEGIN {
    lighter = (a > b) ? a : b
    darker  = (a > b) ? b : a
    printf "%.2f\n", (lighter + 0.05) / (darker + 0.05)
  }'
}

# ---------------------------------------------------------------------------
# CIE76 ΔE (perceptual color distance via Lab)
# ---------------------------------------------------------------------------

hex_to_lab() {
  local rgb
  rgb=$(hex_to_rgb "$1")
  local r g b
  read -r r g b <<< "$rgb"
  awk -v r="$r" -v g="$g" -v b="$b" 'BEGIN {
    # sRGB → linear
    rs = r / 255.0; gs = g / 255.0; bs = b / 255.0
    rl = (rs <= 0.04045) ? rs / 12.92 : ((rs + 0.055) / 1.055) ^ 2.4
    gl = (gs <= 0.04045) ? gs / 12.92 : ((gs + 0.055) / 1.055) ^ 2.4
    bl = (bs <= 0.04045) ? bs / 12.92 : ((bs + 0.055) / 1.055) ^ 2.4

    # Linear RGB → XYZ (D65)
    x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / 0.95047
    y = (0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl) / 1.00000
    z = (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl) / 1.08883

    # XYZ → Lab
    epsilon = 0.008856; kappa = 903.3
    fx = (x > epsilon) ? x ^ (1/3) : (kappa * x + 16) / 116
    fy = (y > epsilon) ? y ^ (1/3) : (kappa * y + 16) / 116
    fz = (z > epsilon) ? z ^ (1/3) : (kappa * z + 16) / 116

    L = 116 * fy - 16
    A = 500 * (fx - fy)
    B = 200 * (fy - fz)

    printf "%.4f %.4f %.4f\n", L, A, B
  }'
}

delta_e() {
  local lab1 lab2
  lab1=$(hex_to_lab "$1")
  lab2=$(hex_to_lab "$2")
  local L1 a1 b1 L2 a2 b2
  read -r L1 a1 b1 <<< "$lab1"
  read -r L2 a2 b2 <<< "$lab2"
  awk -v L1="$L1" -v a1="$a1" -v b1="$b1" -v L2="$L2" -v a2="$a2" -v b2="$b2" 'BEGIN {
    printf "%.1f\n", sqrt((L1-L2)^2 + (a1-a2)^2 + (b1-b2)^2)
  }'
}

# ---------------------------------------------------------------------------
# Pass/fail formatting
# ---------------------------------------------------------------------------

pass_fail() {
  local ratio="$1" threshold="$2"
  awk -v r="$ratio" -v t="$threshold" 'BEGIN {
    printf "%s", (r >= t) ? "PASS" : "FAIL"
  }'
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_contrast() {
  if [[ $# -lt 2 ]]; then
    echo "Usage: $0 contrast <fg-hex> <bg-hex>" >&2
    exit 1
  fi
  local fg="$1" bg="$2"
  local ratio
  ratio=$(contrast_ratio "$fg" "$bg")

  local aa_text aa_large aaa
  aa_text=$(pass_fail "$ratio" 4.5)
  aa_large=$(pass_fail "$ratio" 3.0)
  aaa=$(pass_fail "$ratio" 7.0)

  echo "Foreground: $fg"
  echo "Background: $bg"
  echo "Ratio:      ${ratio}:1"
  echo ""
  echo "AA  text (4.5:1):  $aa_text"
  echo "AA  large (3.0:1): $aa_large"
  echo "AAA text (7.0:1):  $aaa"
}

cmd_ramp() {
  if [[ $# -lt 2 ]]; then
    echo "Usage: $0 ramp <bg-hex> <hex1> <hex2> ... <hexN>" >&2
    exit 1
  fi
  local bg="$1"
  shift

  printf "%-12s  %8s  %-6s  %-6s  %-6s\n" "Color" "Ratio" "AA" "AA-lg" "AAA"
  printf "%-12s  %8s  %-6s  %-6s  %-6s\n" "------------" "--------" "------" "------" "------"

  for fg in "$@"; do
    local ratio
    ratio=$(contrast_ratio "$fg" "$bg")
    local aa aa_lg aaa
    aa=$(pass_fail "$ratio" 4.5)
    aa_lg=$(pass_fail "$ratio" 3.0)
    aaa=$(pass_fail "$ratio" 7.0)
    printf "%-12s  %6s:1  %-6s  %-6s  %-6s\n" "$fg" "$ratio" "$aa" "$aa_lg" "$aaa"
  done

  echo ""
  echo "Background: $bg"
}

cmd_distance() {
  if [[ $# -lt 2 ]]; then
    echo "Usage: $0 distance <hex1> <hex2>" >&2
    exit 1
  fi
  local c1="$1" c2="$2"
  local de
  de=$(delta_e "$c1" "$c2")

  local reading
  if awk -v d="$de" 'BEGIN { exit !(d < 1) }'; then
    reading="imperceptible"
  elif awk -v d="$de" 'BEGIN { exit !(d < 5) }'; then
    reading="close — may confuse"
  elif awk -v d="$de" 'BEGIN { exit !(d < 10) }'; then
    reading="noticeable"
  else
    reading="distinct"
  fi

  echo "Color 1:  $c1"
  echo "Color 2:  $c2"
  echo "ΔE:       $de ($reading)"
}

cmd_palette() {
  if [[ $# -lt 3 || "$2" != "--file" ]]; then
    echo "Usage: $0 palette <bg-hex> --file <path>" >&2
    exit 1
  fi
  local bg="$1"
  local file="$3"

  if [[ ! -f "$file" ]]; then
    echo "Error: file not found: $file" >&2
    exit 1
  fi

  local colors=()
  while IFS= read -r line; do
    # Strip inline comments: keep the hex color (first word), drop everything
    # after two or more spaces followed by #. This preserves the leading #
    # in the hex value itself.
    local token
    token=$(echo "$line" | awk '{print $1}')
    [[ -z "$token" ]] && continue
    [[ "$token" == \#\#* ]] && continue  # full-line comment (##)
    colors+=("$token")
  done < "$file"

  if [[ ${#colors[@]} -eq 0 ]]; then
    echo "Error: no colors found in $file" >&2
    exit 1
  fi
  cmd_ramp "$bg" "${colors[@]}"
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  echo "Commands: contrast, ramp, distance, palette" >&2
  exit 1
fi

command="$1"
shift

case "$command" in
  contrast) cmd_contrast "$@" ;;
  ramp)     cmd_ramp "$@" ;;
  distance) cmd_distance "$@" ;;
  palette)  cmd_palette "$@" ;;
  *)
    echo "Unknown command: $command" >&2
    echo "Commands: contrast, ramp, distance, palette" >&2
    exit 1
    ;;
esac
