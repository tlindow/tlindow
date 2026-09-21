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

The README provenance bar is a generated view of this measurement, not a
hand-drawn figure. Rebuild it with --write-bar (or `make coverage-bar`).
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

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

# Profile bar. Ten cells, filled by the measured AI share (the same 2-decimal
# labels as the JSON report). One light cell stays visible while any hand-typed
# lines remain, and the reverse, so rounding cannot erase a real share.
BAR_WIDTH = 10
README_REL = "README.md"
COVERAGE_BAR_START = "<!-- coverage-bar:start -->"
COVERAGE_BAR_END = "<!-- coverage-bar:end -->"
TYPING_BADGE_RE = re.compile(
    r'<img src="https://img\.shields\.io/badge/Typing%20Coverage-[^"]+" '
    r'alt="Typing Coverage [^"]+" />'
)

def format_threshold(threshold: float) -> str:
    """Render a threshold without a trailing decimal (10, not 10.0)."""
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

def render_coverage_bar_line(ai_label: str, hand_label: str, width: int = BAR_WIDTH) -> str:
    """One-line provenance bar. Filled cells track the measured AI share."""
    ai_pct = float(ai_label)
    filled = int(round((ai_pct / 100.0) * width))
    if ai_pct <= 0:
        filled = 0
    elif ai_pct >= 100:
        filled = width
    else:
        filled = min(max(filled, 1), width - 1)
    bar = "█" * filled + "░" * (width - filled)
    return f"{bar} {ai_label}% AI · {hand_label}% hand"

def render_coverage_bar_block(ai_label: str, hand_label: str) -> str:
    """Markdown fence that displays the bar as text on the profile."""
    return "```text\n" + render_coverage_bar_line(ai_label, hand_label) + "\n```"

def render_typing_badge(hand_label: str, passed: bool, threshold: float) -> str:
    """Shields.io chip kept in lockstep with the measured hand-typed share."""
    status = "PASS" if passed else "FAIL"
    color = "10B981" if passed else "EF4444"
    threshold_label = format_threshold(threshold)
    src = (
        "https://img.shields.io/badge/Typing%20Coverage-"
        f"{hand_label}%25%20{status}%20(%E2%89%A5{threshold_label}%25)-{color}?style=flat-square"
    )
    alt = f"Typing Coverage {hand_label}% {status}"
    return f'<img src="{src}" alt="{alt}" />'

def _marked_region_pattern() -> re.Pattern:
    return re.compile(
        re.escape(COVERAGE_BAR_START) + r"\n(.*)\n" + re.escape(COVERAGE_BAR_END),
        re.DOTALL,
    )

def extract_coverage_bar_block(readme: str) -> str | None:
    match = _marked_region_pattern().search(readme)
    if not match:
        return None
    return match.group(1)

def apply_coverage_display(readme: str, block: str, badge: str) -> tuple[str, str | None]:
    """Return (updated README, error). Markers and the typing badge are required."""
    if extract_coverage_bar_block(readme) is None:
        return readme, (
            "README.md is missing coverage bar markers "
            f"({COVERAGE_BAR_START} ... {COVERAGE_BAR_END})."
        )
    updated = _marked_region_pattern().sub(
        f"{COVERAGE_BAR_START}\n{block}\n{COVERAGE_BAR_END}",
        readme,
        count=1,
    )
    if not TYPING_BADGE_RE.search(updated):
        return updated, "README.md is missing the Typing Coverage badge."
    updated = TYPING_BADGE_RE.sub(badge, updated, count=1)
    return updated, None

def bar_out_of_date_message(ai_label: str, hand_label: str, ai_loc: int, hand_loc: int) -> str:
    return (
        "README coverage bar does not match the working tree: "
        f"{ai_label}% AI scaffolding ({ai_loc:,} lines), "
        f"{hand_label}% hand-typed ({hand_loc:,} lines).\n"
        "Regenerate with: make coverage-bar"
    )

def coverage_display_for(measured: dict, threshold: float) -> tuple[str, str, str, str, bool]:
    """Return (block, badge, ai_label, hand_label, passed) for a measurement."""
    coverage_pct = measured["coverage_pct"]
    passed = coverage_pct >= threshold
    ai_label, hand_label = coverage_labels(coverage_pct, measured["total_loc"])
    block = render_coverage_bar_block(ai_label, hand_label)
    badge = render_typing_badge(hand_label, passed, threshold)
    return block, badge, ai_label, hand_label, passed

def refresh_readme_bar(repo_root: Path, threshold: float) -> None:
    """Rewrite the README bar until it matches the tree that contains it."""
    readme_path = repo_root / README_REL
    if not readme_path.exists():
        raise SystemExit(f"Missing {README_REL}")

    for _ in range(6):
        measured = measure_coverage("working-tree", repo_root)
        block, badge, _, _, _ = coverage_display_for(measured, threshold)
        current = readme_path.read_text(encoding="utf-8")
        updated, error = apply_coverage_display(current, block, badge)
        if error:
            raise SystemExit(error)
        if updated == current:
            return
        readme_path.write_text(updated, encoding="utf-8")

    raise SystemExit("Coverage bar did not stabilize after rewriting README.md.")

def readme_bar_mismatch(repo_root: Path, threshold: float, measured: dict) -> str | None:
    """None when the committed README bar matches this measurement."""
    readme_path = repo_root / README_REL
    current = readme_path.read_text(encoding="utf-8") if readme_path.exists() else ""
    block, badge, ai_label, hand_label, _ = coverage_display_for(measured, threshold)
    found = extract_coverage_bar_block(current)
    if found is None:
        return (
            "README.md is missing the generated coverage bar "
            f"({COVERAGE_BAR_START} ... {COVERAGE_BAR_END}).\n"
            "Regenerate with: make coverage-bar"
        )
    if found != block:
        return bar_out_of_date_message(
            ai_label, hand_label, measured["total_ai"], measured["total_hand"]
        )
    if badge not in current:
        return (
            "README.md Typing Coverage badge does not match the measurement: "
            f"{hand_label}% hand-typed.\n"
            "Regenerate with: make coverage-bar"
        )
    return None

def main():
    parser = argparse.ArgumentParser(
        description="Verify repository hand-typed code coverage meets Embodiment Rule threshold.",
        epilog=(
            "The profile bar is generated from the full working tree: "
            "python3 scripts/check_typing_coverage.py --write-bar"
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
        "--write-bar",
        action="store_true",
        help=(
            "Rewrite the README provenance bar from the full working tree, "
            "using the same provenance rules as this linter. Ignores --mode."
        ),
    )
    parser.add_argument(
        "--check-bar",
        action="store_true",
        help=(
            "Exit 1 if the README provenance bar differs from the text this "
            "command would write for the full working tree. Ignores --mode."
        ),
    )

    args = parser.parse_args()
    repo_root = get_repo_root()
    # The committed bar is the whole repo on disk, not the staged slice.
    # Rewrite first so the measurement below includes the bar's own lines.
    if args.write_bar:
        refresh_readme_bar(repo_root, args.threshold)

    measure_mode = "working-tree" if (args.write_bar or args.check_bar) else args.mode
    measured = measure_coverage(measure_mode, repo_root)
    total_hand = measured["total_hand"]
    total_ai = measured["total_ai"]
    total_loc = measured["total_loc"]
    coverage_pct = measured["coverage_pct"]
    files = measured["files"]
    file_stats = measured["file_stats"]
    passed = coverage_pct >= args.threshold
    ai_label, hand_label = coverage_labels(coverage_pct, total_loc)
    provenance_bar = render_coverage_bar_line(ai_label, hand_label)

    bar_error = None
    if args.write_bar or args.check_bar:
        bar_error = readme_bar_mismatch(repo_root, args.threshold, measured)

    if args.json:
        result = {
            "passed": passed,
            "threshold": args.threshold,
            "hand_typed_coverage_pct": round(coverage_pct, 2),
            "total_loc": total_loc,
            "hand_typed_loc": total_hand,
            "ai_generated_loc": total_ai,
            "provenance_bar": provenance_bar,
            "files_count": len(files),
            "files": file_stats
        }
        print(json.dumps(result, indent=2))
        if bar_error:
            print(bar_error, file=sys.stderr)
        sys.exit(0 if passed and not bar_error else 1)

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

    if args.write_bar:
        print(f"  {BOLD}Wrote{RESET} README provenance bar")
        print(f"  {DIM}{provenance_bar}{RESET}")
        print(f"  {DIM}Measured working tree: {ai_label}% AI scaffolding ({total_ai:,} lines), {hand_label}% hand-typed ({total_hand:,} lines).{RESET}\n")

    if passed and not bar_error:
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

    if bar_error:
        print(f"  {RED}{BOLD}✖ BAR OUT OF DATE:{RESET} {bar_error}\n")

    print(f"{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")
    sys.exit(1)

if __name__ == "__main__":
    main()
