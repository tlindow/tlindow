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
"""

import argparse
import json
import os
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
    try:
        root = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        return Path(root)
    except Exception:
        return Path.cwd()

def get_files_to_check(mode: str = "staged") -> list[str]:
    """Get relative file paths based on mode (staged or working-tree)."""
    try:
        if mode == "staged":
            stage_all = subprocess.check_output(
                ["git", "ls-files", "--stage"],
                stderr=subprocess.DEVNULL
            ).decode().splitlines()
            all_files = [l.split("\t", 1)[1] for l in stage_all if "\t" in l]
        else:
            all_files = subprocess.check_output(
                ["git", "ls-files"],
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

def main():
    parser = argparse.ArgumentParser(
        description="Verify repository hand-typed code coverage meets Embodiment Rule threshold."
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

    args = parser.parse_args()
    repo_root = get_repo_root()
    files = get_files_to_check(args.mode)

    total_hand = 0
    total_ai = 0
    file_stats = []

    for f in files:
        content = get_file_content(f, mode=args.mode, repo_root=repo_root)
        hand, ai = analyze_file_provenance(f, content)
        tot = hand + ai
        total_hand += hand
        total_ai += ai
        if tot > 0:
            file_stats.append({
                "file": f,
                "total": tot,
                "hand": hand,
                "ai": ai,
                "hand_pct": (hand / tot) * 100.0 if tot > 0 else 0.0
            })

    total_loc = total_hand + total_ai
    coverage_pct = (total_hand / total_loc * 100.0) if total_loc > 0 else 0.0
    passed = coverage_pct >= args.threshold

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
        sys.exit(0 if passed else 1)

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

    if passed:
        print(f"  {GREEN}{BOLD}✔ PASS:{RESET} {GREEN}Codebase embodies the typing threshold! Commit permitted.{RESET}")
        print(f"{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")
        sys.exit(0)
    else:
        print(f"  {RED}{BOLD}✖ REJECTED:{RESET} {RED}Typing coverage fell below {args.threshold:.1f}%!{RESET}")
        print(f"  {DIM}Tyler Lindow Axiom: 'Typing IS learning. If we outsource our typing,")
        print(f"  we outsource our learning.'{RESET}\n")
        print(f"  {BOLD}Remediation Options:{RESET}")
        print(f"  1. Hand-type the core solution or architectural logic.")
        print(f"  2. Tag hand-written files with '{CYAN}@provenance: hand-typed{RESET}' in header comments.")
        print(f"  3. Wrap hand-typed sections with '{CYAN}@hand-typed:start{RESET}' ... '{CYAN}@hand-typed:end{RESET}'.")
        print(f"{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
