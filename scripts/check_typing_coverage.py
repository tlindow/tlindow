#!/usr/bin/env python3
"""
Typing Coverage Linter (Embodiment Rule)
----------------------------------------
Enforces Tyler Lindow's core philosophy:
  "Typing IS learning. When we type, we embody the code.
   If we outsource our typing, we outsource our learning."

Axiom: Top-down AI scaffolding is permitted up to 90%, but at least 10%
of the codebase must be deliberate, hand-typed craft and synthesis.

Fails (exit code 1) if hand-typed coverage falls below 10.0%.

assets/coverage-bar.svg is a generated view of this measurement, not a
hand-drawn figure. Rebuild it with --write-svg (or `make coverage-svg`).
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from xml.sax.saxutils import escape

# Minimum percentage of hand-typed code required to pass commit
DEFAULT_THRESHOLD = 10.0

IGNORED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".lock",
    ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".webm", ".zip", ".tar", ".gz"
}
IGNORED_FILENAMES = {
    "package-lock.json", "pnpm-lock.yaml", "yarn.lock"
}

# Known repository files that are authored by hand
KNOWN_HAND_FILES = {
    "README.md",
    "first-post.md",
    "exercises/realtime-deal-room/SOLUTION.md",
    "exercises/realtime-deal-room/learnings.md",
}

# Known lab exercises where human wrote the solution within an AI-generated scaffold
KNOWN_PARTIAL_FILES = {
    # Proto lab: Schema starting after lab instructions delimiter (line 42)
    "exercises/proto-learning/p2p_payment_service.proto": {
        "type": "after_last_marker",
        "marker": "// ============================================================================"
    },
    # Next.js exercises: Hand-typed solution blocks
    "exercises/nextjs-learning/exercise_01_rsc_pipeline.tsx": {"type": "fixed", "lines": 38},
    "exercises/nextjs-learning/exercise_02_streaming_suspense.tsx": {"type": "fixed", "lines": 27},
    "exercises/nextjs-learning/exercise_03_server_actions_optimistic.tsx": {"type": "fixed", "lines": 58},
    "exercises/nextjs-learning/exercise_04_cache_revalidation.ts": {"type": "fixed", "lines": 28},
}

START_MARKER_REGEX = re.compile(r"^\s*(?://|#|/\*|<!--)\s*@hand-typed:start\b", re.IGNORECASE)
END_MARKER_REGEX = re.compile(r"^\s*(?://|#|/\*|<!--)\s*@hand-typed:end\b", re.IGNORECASE)
HEADER_HAND_REGEX = re.compile(r"^\s*(?://|#|/\*|<!--)\s*@(provenance:\s*hand-typed|hand-typed)\b", re.IGNORECASE)
HEADER_AI_REGEX = re.compile(r"^\s*(?://|#|/\*|<!--)\s*@(provenance:\s*ai-generated|ai-generated)\b", re.IGNORECASE)

def get_repo_root() -> Path:
    # Search from the script so `python3 path/to/check_typing_coverage.py`
    # still measures this repo when the shell is somewhere else.
    script_dir = Path(__file__).resolve().parent
    try:
        root = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=script_dir,
            stderr=subprocess.DEVNULL
        ).decode().strip()
        return Path(root)
    except Exception:
        return script_dir

def get_files_to_check(mode: str = "staged", repo_root: Path | None = None) -> list[str]:
    """Get relative file paths based on mode (staged or working-tree)."""
    if repo_root is None:
        repo_root = get_repo_root()
    try:
        if mode == "staged":
            stage_all = subprocess.check_output(
                ["git", "ls-files", "--stage"],
                cwd=repo_root,
                stderr=subprocess.DEVNULL
            ).decode().splitlines()
            all_files = [l.split("\t", 1)[1] for l in stage_all if "\t" in l]
        else:
            all_files = subprocess.check_output(
                ["git", "ls-files"],
                cwd=repo_root,
                stderr=subprocess.DEVNULL
            ).decode().splitlines()
    except subprocess.CalledProcessError:
        all_files = []

    valid_files = []
    for f in all_files:
        p = Path(f)
        if p.suffix.lower() in IGNORED_EXTENSIONS or p.name in IGNORED_FILENAMES:
            continue
        valid_files.append(f)
    return sorted(valid_files)

def get_file_content(rel_path: str, mode: str = "staged", repo_root: Path = None) -> str:
    """Retrieve file content from git index if staged, or disk if working-tree."""
    if repo_root is None:
        repo_root = get_repo_root()

    if mode == "staged":
        try:
            return subprocess.check_output(
                ["git", "show", f":{rel_path}"],
                cwd=repo_root,
                stderr=subprocess.DEVNULL
            ).decode("utf-8", errors="replace")
        except Exception:
            pass

    full_path = repo_root / rel_path
    if full_path.exists():
        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as fp:
                return fp.read()
        except Exception:
            return ""
    return ""

def analyze_file_provenance(rel_path: str, content: str) -> tuple[int, int]:
    """
    Returns (hand_typed_lines, ai_generated_lines) for given file content.
    """
    lines = content.splitlines()
    total = len(lines)
    if total == 0:
        return 0, 0

    # 1. Whole-file comment annotations in first 20 lines
    for line in lines[:20]:
        if HEADER_HAND_REGEX.search(line):
            return total, 0
        if HEADER_AI_REGEX.search(line):
            return 0, total

    # 2. Well-known synthesis files
    basename = Path(rel_path).name
    if rel_path in KNOWN_HAND_FILES or basename in ["SOLUTION.md", "learnings.md"]:
        return total, 0

    # 3. Known partial solution files
    if rel_path in KNOWN_PARTIAL_FILES:
        rule = KNOWN_PARTIAL_FILES[rel_path]
        if rule["type"] == "fixed":
            hand = min(rule["lines"], total)
            return hand, max(0, total - hand)
        elif rule["type"] == "after_last_marker":
            marker = rule["marker"]
            last_idx = -1
            for idx, line in enumerate(lines):
                if marker in line:
                    last_idx = idx
            if last_idx != -1:
                hand = max(0, total - (last_idx + 1))
                return hand, max(0, total - hand)

    # 4. Explicit comment block annotations (@hand-typed:start ... @hand-typed:end)
    hand_count = 0
    in_hand_block = False
    for line in lines:
        if START_MARKER_REGEX.search(line):
            in_hand_block = True
            hand_count += 1
            continue
        if END_MARKER_REGEX.search(line):
            in_hand_block = False
            hand_count += 1
            continue
        if in_hand_block:
            hand_count += 1

    if hand_count > 0:
        return hand_count, max(0, total - hand_count)

    # Default: treated as AI scaffolding / reference tooling
    return 0, total

def render_progress_bar(pct: float, width: int = 30) -> str:
    filled = int(round((pct / 100.0) * width))
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}]"

def measure_coverage(mode: str = "staged", repo_root: Path | None = None) -> dict:
    """Run the linter's provenance rules and return aggregate counts."""
    if repo_root is None:
        repo_root = get_repo_root()

    files = get_files_to_check(mode, repo_root)
    total_hand = 0
    total_ai = 0
    file_stats = []

    for rel_path in files:
        content = get_file_content(rel_path, mode=mode, repo_root=repo_root)
        hand, ai = analyze_file_provenance(rel_path, content)
        total = hand + ai
        total_hand += hand
        total_ai += ai
        if total > 0:
            file_stats.append({
                "file": rel_path,
                "total": total,
                "hand": hand,
                "ai": ai,
                "hand_pct": (hand / total) * 100.0 if total > 0 else 0.0,
            })

    total_loc = total_hand + total_ai
    coverage_pct = (total_hand / total_loc * 100.0) if total_loc > 0 else 0.0
    return {
        "total_hand": total_hand,
        "total_ai": total_ai,
        "total_loc": total_loc,
        "coverage_pct": coverage_pct,
        "files": files,
        "file_stats": file_stats,
    }

# Profile pill. Widths are the measured line-count ratio; labels use the
# same 2-decimal rounding as the JSON report. A 4px gutter matches the
# hand-designed bar and is omitted when one segment is empty.
SVG_WIDTH = 480
SVG_BAR_GUTTER = 4

SVG_STYLE = """  <style>
    .num, .name, .caption {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-variant-numeric: tabular-nums;
    }
    .num {
      font-size: 20px;
      font-weight: 650;
      fill: #1C1917;
    }
    .num.num-hand { fill: #146B45; }
    .name {
      font-size: 16px;
      font-weight: 500;
      fill: #57534E;
    }
    .caption {
      font-size: 15px;
      font-weight: 450;
      fill: #57534E;
    }
    .bar-ai { fill: #6E5F96; }
    .bar-hand { fill: #1F7A4D; }

    @media (prefers-color-scheme: dark) {
      .num { fill: #F4F1EA; }
      .num.num-hand { fill: #8ED7B5; }
      .name, .caption { fill: #C9D1D9; }
      .bar-ai { fill: #A898D0; }
      .bar-hand { fill: #3FA875; }
    }
  </style>"""

def format_threshold(threshold: float) -> str:
    """Render a threshold the way the pill caption should read (10, not 10.0)."""
    rounded = round(float(threshold), 2)
    if abs(rounded - round(rounded)) < 1e-9:
        return str(int(round(rounded)))
    return f"{rounded:.2f}".rstrip("0").rstrip(".")

def coverage_labels(coverage_pct: float, total_loc: int) -> tuple[str, str]:
    """
    Return (ai_percent, hand_percent) display strings.

    Hand-typed uses the linter's rounded percentage. AI is the complement,
    so the two labels add to 100.00. An empty tree is 0.00 / 0.00.
    """
    if total_loc <= 0:
        return "0.00", "0.00"
    hand_rounded = round(coverage_pct, 2)
    hand_label = f"{hand_rounded:.2f}"
    ai_rounded = round(100.0 - hand_rounded, 2)
    ai_label = f"{ai_rounded:.2f}"
    return ai_label, hand_label

def bar_segment_widths(hand_loc: int, ai_loc: int) -> tuple[int, int, int]:
    """
    Return (ai_width, gutter, hand_width) in pixels, summing to SVG_WIDTH.

    Widths follow the raw line counts. Each non-empty segment keeps at least
    one pixel so a real count cannot disappear into rounding.
    """
    total = hand_loc + ai_loc
    if total <= 0 or hand_loc < 0 or ai_loc < 0:
        return 0, 0, 0
    if hand_loc == 0:
        return SVG_WIDTH, 0, 0
    if ai_loc == 0:
        return 0, 0, SVG_WIDTH

    usable = SVG_WIDTH - SVG_BAR_GUTTER
    hand_width = int(round(hand_loc / total * usable))
    hand_width = min(max(hand_width, 1), usable - 1)
    ai_width = usable - hand_width
    return ai_width, SVG_BAR_GUTTER, hand_width

def render_coverage_svg(
    *,
    hand_loc: int,
    ai_loc: int,
    coverage_pct: float,
    passed: bool,
    threshold: float,
) -> str:
    """Build the profile pill from measured counts. No pass/fail chrome."""
    total_loc = hand_loc + ai_loc
    ai_label, hand_label = coverage_labels(coverage_pct, total_loc)
    ai_width, gutter, hand_width = bar_segment_widths(hand_loc, ai_loc)
    threshold_label = format_threshold(threshold)

    if total_loc <= 0:
        caption = f"Typing is learning. No measured lines yet; it fails below {threshold_label}%."
        passed_attr = "false"
    elif passed:
        caption = f"Typing is learning. Hand-typed craft passes; it fails below {threshold_label}%."
        passed_attr = "true"
    else:
        caption = f"Typing is learning. Hand-typed craft is below {threshold_label}%."
        passed_attr = "false"

    title = f"Codebase provenance: {ai_label}% AI scaffolding, {hand_label}% hand-typed craft"
    desc = (
        f"Measured by scripts/check_typing_coverage.py. "
        f"{hand_loc:,} of {total_loc:,} lines are hand-typed ({hand_label}%); "
        f"{ai_loc:,} are AI scaffolding ({ai_label}%). "
        f"{caption}"
    )

    rects = []
    cursor = 0
    if ai_width:
        rects.append(f'    <rect class="bar-ai" width="{ai_width}" height="18" y="38" />')
        cursor += ai_width
    if gutter:
        cursor += gutter
    if hand_width:
        x_attr = f' x="{cursor}"' if cursor else ""
        rects.append(
            f'    <rect class="bar-hand"{x_attr} width="{hand_width}" height="18" y="38" />'
        )
    rect_block = "\n".join(rects)
    width_comment = (
        f"    <!-- {ai_loc} AI lines -> {ai_width}px; "
        f"{gutter}px gutter; {hand_loc} hand-typed lines -> {hand_width}px -->"
    )

    return f"""<!-- Generated from the typing-coverage linter. Do not edit by hand. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SVG_WIDTH} 96" width="{SVG_WIDTH}" height="96" fill="none" role="img" data-ai-pct="{ai_label}" data-hand-typed-pct="{hand_label}" data-ai-loc="{ai_loc}" data-hand-typed-loc="{hand_loc}" data-total-loc="{total_loc}" data-threshold="{escape(threshold_label)}" data-passed="{passed_attr}">
  <title>{escape(title)}</title>
  <desc>{escape(desc)}</desc>
{SVG_STYLE}

  <text x="0" y="22" class="num">{ai_label}%<tspan class="name" dx="10">AI scaffolding</tspan></text>
  <text x="{SVG_WIDTH}" y="22" text-anchor="end" class="name">Hand-typed craft<tspan class="num num-hand" dx="10">{hand_label}%</tspan></text>

  <defs>
    <clipPath id="coverage-pill">
      <rect width="{SVG_WIDTH}" height="18" y="38" rx="9" />
    </clipPath>
  </defs>
  <g clip-path="url(#coverage-pill)">
{width_comment}
{rect_block}
  </g>

  <text x="0" y="80" class="caption">{escape(caption)}</text>
</svg>
"""

def svg_out_of_date_message(path: str, ai_label: str, hand_label: str, ai_loc: int, hand_loc: int) -> str:
    return (
        f"{path} does not match the working tree: "
        f"{ai_label}% AI scaffolding ({ai_loc:,} lines), "
        f"{hand_label}% hand-typed ({hand_loc:,} lines).\n"
        f"Regenerate with: python3 scripts/check_typing_coverage.py --write-svg {path}"
    )

def resolve_repo_path(path_str: str, repo_root: Path) -> Path:
    path = Path(path_str)
    if path.is_absolute():
        return path
    return repo_root / path

def main():
    parser = argparse.ArgumentParser(
        description="Verify repository hand-typed code coverage meets Embodiment Rule threshold.",
        epilog=(
            "The profile bar is generated from the full working tree: "
            "python3 scripts/check_typing_coverage.py --write-svg assets/coverage-bar.svg"
        ),
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Minimum hand-typed percentage required (default: {DEFAULT_THRESHOLD}%%)"
    )
    parser.add_argument(
        "--mode",
        choices=["staged", "working-tree"],
        default="staged",
        help="Check git staged index or working-tree files (default: staged)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print detailed file-by-file breakdown"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    parser.add_argument(
        "--write-svg",
        metavar="PATH",
        help=(
            "Write the coverage-bar SVG to PATH from the full working tree, "
            "using the same provenance rules as this linter. Ignores --mode."
        ),
    )
    parser.add_argument(
        "--check-svg",
        metavar="PATH",
        help=(
            "Exit 1 if PATH differs from the SVG this command would write for "
            "the full working tree. Ignores --mode."
        ),
    )

    args = parser.parse_args()
    repo_root = get_repo_root()
    # The committed figure is the whole repo on disk, not the staged slice.
    measure_mode = "working-tree" if (args.write_svg or args.check_svg) else args.mode
    measured = measure_coverage(measure_mode, repo_root)
    total_hand = measured["total_hand"]
    total_ai = measured["total_ai"]
    total_loc = measured["total_loc"]
    coverage_pct = measured["coverage_pct"]
    files = measured["files"]
    file_stats = measured["file_stats"]
    passed = coverage_pct >= args.threshold
    ai_label, hand_label = coverage_labels(coverage_pct, total_loc)

    svg_text = None
    svg_mismatch = False
    if args.write_svg or args.check_svg:
        svg_text = render_coverage_svg(
            hand_loc=total_hand,
            ai_loc=total_ai,
            coverage_pct=coverage_pct,
            passed=passed,
            threshold=args.threshold,
        )
    if args.write_svg:
        destination = resolve_repo_path(args.write_svg, repo_root)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(svg_text, encoding="utf-8")
    if args.check_svg:
        check_path = resolve_repo_path(args.check_svg, repo_root)
        current = check_path.read_text(encoding="utf-8") if check_path.exists() else ""
        svg_mismatch = current != svg_text

    if args.json:
        result = {
            "passed": passed,
            "threshold": args.threshold,
            "hand_typed_coverage_pct": round(coverage_pct, 2),
            "total_loc": total_loc,
            "hand_typed_loc": total_hand,
            "ai_generated_loc": total_ai,
            "files_count": len(files),
            "files": file_stats
        }
        print(json.dumps(result, indent=2))
        if svg_mismatch:
            print(
                svg_out_of_date_message(args.check_svg, ai_label, hand_label, total_ai, total_hand),
                file=sys.stderr,
            )
        sys.exit(0 if passed and not svg_mismatch else 1)

    # ANSI Colors
    GREEN = "\033[92m"
    RED = "\033[91m"
    PURPLE = "\033[95m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"

    if not sys.stdout.isatty():
        GREEN = RED = PURPLE = CYAN = BOLD = DIM = RESET = ""

    print(f"\n{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"{BOLD} ⚡ LINDOW LABS — EMBODIMENT LINTER{RESET}")
    print(f"{DIM} Rule: Minimum {args.threshold:.1f}% hand-typed code required before commit.{RESET}")
    print(f"{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")

    if args.verbose:
        print(f"{CYAN}Tracked Files ({len(files)} total):{RESET}")
        for s in file_stats:
            tag = f"{GREEN}HAND{RESET}" if s['hand_pct'] == 100 else (f"{PURPLE}PART{RESET}" if s['hand'] > 0 else f"{DIM}AI{RESET}")
            print(f"  [{tag}] {s['file']:<55} {s['hand']:>4} / {s['total']:<4} ({s['hand_pct']:>5.1f}%)")
        print()

    bar = render_progress_bar(coverage_pct)
    color = GREEN if passed else RED

    print(f"  {BOLD}Hand-Typed Coverage:{RESET}  {color}{BOLD}{coverage_pct:.1f}%{RESET} {bar}")
    print(f"  {BOLD}Required Threshold:{RESET}   ≥ {args.threshold:.1f}%\n")
    print(f"  • Hand-Typed Craft:    {GREEN}{total_hand:,} LOC{RESET} ({coverage_pct:.1f}%)")
    print(f"  • AI Scaffolding:      {PURPLE}{total_ai:,} LOC{RESET} ({100.0 - coverage_pct:.1f}%)")
    print(f"  • Total Evaluated:     {total_loc:,} LOC across {len(files)} files\n")

    if args.write_svg:
        print(f"  {BOLD}Wrote{RESET} {args.write_svg}")
        print(f"  {DIM}Measured working tree: {ai_label}% AI scaffolding ({total_ai:,} lines), {hand_label}% hand-typed ({total_hand:,} lines).{RESET}\n")

    if passed and not svg_mismatch:
        print(f"  {GREEN}{BOLD}✔ PASS:{RESET} {GREEN}Codebase embodies the typing threshold! Commit permitted.{RESET}")
        print(f"{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")
        sys.exit(0)

    if not passed:
        print(f"  {RED}{BOLD}✖ REJECTED:{RESET} {RED}Typing coverage fell below {args.threshold:.1f}%!{RESET}")
        print(f"  {DIM}Tyler Lindow Axiom: 'Typing IS learning. If we outsource our typing,")
        print(f"  we outsource our learning.'{RESET}\n")
        print(f"  {BOLD}Remediation Options:{RESET}")
        print(f"  1. Hand-type the core solution or architectural logic.")
        print(f"  2. Tag hand-written files with '{CYAN}@provenance: hand-typed{RESET}' in header comments.")
        print(f"  3. Wrap hand-typed sections with '{CYAN}@hand-typed:start{RESET}' ... '{CYAN}@hand-typed:end{RESET}'.")

    if svg_mismatch:
        print(f"  {RED}{BOLD}✖ SVG OUT OF DATE:{RESET} {svg_out_of_date_message(args.check_svg, ai_label, hand_label, total_ai, total_hand)}\n")

    print(f"{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")
    sys.exit(1)

if __name__ == "__main__":
    main()
