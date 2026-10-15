#!/usr/bin/env python3
"""
merge_session_transcripts.py

Collect the main transcript and every subagent transcript for a Claude Code
session ID, then interleave them into one timeline sorted by timestamp.

Claude Code stores sessions under ~/.claude/projects/<project-slug>/:
    <session-id>.jsonl                       main conversation
    <session-id>/subagents/agent-*.jsonl     each subagent's full transcript
    <session-id>/**/*.jsonl                  any other agent transcripts (picked up too)

Usage:
    python3 merge_session_transcripts.py <session-id>
    python3 merge_session_transcripts.py <session-id> -f md -o session.md
    python3 merge_session_transcripts.py <session-id> -f jsonl -o merged.jsonl
    python3 merge_session_transcripts.py <session-id> --projects-dir /path/to/.claude/projects

Formats:
    text   readable plain text (default)
    md     Markdown, one heading per message
    jsonl  the original JSON entries, merged, each tagged with "_source"
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_PROJECTS_DIR = Path.home() / ".claude" / "projects"
MIN_TS = datetime.min.replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------- discovery

def find_session_files(session_id: str, projects_dir: Path):
    """Return (main_file or None, [agent files]) for the session ID."""
    mains = sorted(projects_dir.glob(f"*/{session_id}.jsonl"))
    session_dirs = sorted(p for p in projects_dir.glob(f"*/{session_id}") if p.is_dir())

    if not mains and not session_dirs:
        return None, []

    if len(mains) > 1:
        print(f"warning: session found in {len(mains)} project folders; using all of them",
              file=sys.stderr)

    agent_files = []
    for d in session_dirs:
        agent_files.extend(sorted(d.rglob("*.jsonl")))

    return (mains, agent_files)


def source_label(path: Path, session_id: str) -> str:
    if path.name == f"{session_id}.jsonl":
        return "main"
    stem = path.stem  # e.g. agent-a1b2c3
    meta = path.with_suffix(".meta.json")
    if meta.exists():
        try:
            m = json.loads(meta.read_text())
            kind = m.get("agentType") or m.get("subagent_type") or m.get("type")
            if kind:
                return f"{stem} ({kind})"
        except (OSError, json.JSONDecodeError):
            pass
    return stem


# ---------------------------------------------------------------- loading

def parse_ts(value):
    if not value or not isinstance(value, str):
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def load_entries(path: Path, label: str, file_index: int):
    """Read one JSONL file. Entries with no timestamp borrow their neighbor's,
    so metadata lines stay next to the messages they belong with."""
    raw = []
    with path.open(encoding="utf-8") as fh:
        for line_no, line in enumerate(fh):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                print(f"warning: skipping bad JSON at {path}:{line_no + 1}", file=sys.stderr)
                continue
            raw.append((line_no, entry, parse_ts(entry.get("timestamp"))))

    # carry the last known timestamp forward; backfill leading gaps with the first one
    first_ts = next((ts for _, _, ts in raw if ts), None)
    last = first_ts or MIN_TS
    out = []
    for line_no, entry, ts in raw:
        if ts:
            last = ts
        out.append({
            "ts": ts or last,
            "has_ts": ts is not None,
            "file_index": file_index,
            "line_no": line_no,
            "source": label,
            "entry": entry,
        })
    return out


def merge(session_id: str, projects_dir: Path):
    mains, agent_files = find_session_files(session_id, projects_dir)
    if mains is None:
        sys.exit(f"error: no session '{session_id}' under {projects_dir}")

    files = list(mains) + agent_files
    records, seen_uuids = [], set()
    # read agent files first so a duplicated sidechain turn keeps its agent label;
    # file_index still reflects main-first order for tie-breaking in the sort
    order = list(range(len(mains), len(files))) + list(range(len(mains)))
    for i in order:
        path = files[i]
        label = source_label(path, session_id)
        for rec in load_entries(path, label, i):
            uuid = rec["entry"].get("uuid")
            # older versions also wrote subagent ("sidechain") turns inline in the
            # main file; drop exact duplicates by uuid so nothing appears twice
            if uuid:
                if uuid in seen_uuids:
                    continue
                seen_uuids.add(uuid)
            records.append(rec)

    # stable sort: timestamp, then file, then original line order
    records.sort(key=lambda r: (r["ts"], r["file_index"], r["line_no"]))
    return files, records


# ---------------------------------------------------------------- rendering

def block_to_text(block, max_tool_chars):
    if isinstance(block, str):
        return block
    if not isinstance(block, dict):
        return str(block)
    kind = block.get("type")
    if kind == "text":
        return block.get("text", "")
    if kind == "thinking":
        return f"[thinking]\n{block.get('thinking', '')}"
    if kind == "redacted_thinking":
        return "[redacted thinking]"
    if kind == "tool_use":
        args = json.dumps(block.get("input", {}), ensure_ascii=False, indent=2)
        return f"[tool call: {block.get('name')} id={block.get('id')}]\n{clip(args, max_tool_chars)}"
    if kind == "tool_result":
        content = block.get("content")
        if isinstance(content, list):
            content = "\n".join(block_to_text(b, max_tool_chars) for b in content)
        status = " ERROR" if block.get("is_error") else ""
        return f"[tool result{status} for {block.get('tool_use_id')}]\n{clip(str(content or ''), max_tool_chars)}"
    if kind == "image":
        return "[image]"
    return f"[{kind} block]"


def clip(text, limit):
    if limit and len(text) > limit:
        return text[:limit] + f"\n... [{len(text) - limit} more chars]"
    return text


def entry_body(entry, max_tool_chars):
    msg = entry.get("message")
    if isinstance(msg, dict):
        content = msg.get("content")
        if isinstance(content, list):
            return "\n\n".join(block_to_text(b, max_tool_chars) for b in content)
        return str(content or "")
    for key in ("summary", "content", "text"):
        if isinstance(entry.get(key), str):
            return entry[key]
    return ""


def entry_role(entry):
    msg = entry.get("message")
    role = msg.get("role") if isinstance(msg, dict) else None
    return role or entry.get("type") or "entry"


def render_text(records, md, include_meta, max_tool_chars):
    lines = []
    for r in records:
        e = r["entry"]
        if e.get("type") not in ("user", "assistant") and not include_meta:
            continue
        body = entry_body(e, max_tool_chars).strip()
        if not body and not include_meta:
            continue
        ts = r["ts"].isoformat() if r["ts"] != MIN_TS else "no timestamp"
        if not r["has_ts"]:
            ts += " (inferred)"
        header = f"{ts}  [{r['source']}]  {entry_role(e)}"
        if md:
            lines.append(f"### {header}\n\n```\n{body}\n```\n" if body else f"### {header}\n")
        else:
            lines.append(f"===== {header} =====\n{body}\n")
    return "\n".join(lines)


def render_jsonl(records):
    out = []
    for r in records:
        e = dict(r["entry"])
        e["_source"] = r["source"]
        if not r["has_ts"]:
            e["_inferred_timestamp"] = r["ts"].isoformat() if r["ts"] != MIN_TS else None
        out.append(json.dumps(e, ensure_ascii=False))
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("session_id")
    ap.add_argument("-f", "--format", choices=["text", "md", "jsonl"], default="text")
    ap.add_argument("-o", "--output", help="write here instead of stdout")
    ap.add_argument("--projects-dir", type=Path, default=DEFAULT_PROJECTS_DIR)
    ap.add_argument("--include-meta", action="store_true",
                    help="also show non-message entries (summaries, snapshots, system lines)")
    ap.add_argument("--max-tool-chars", type=int, default=4000,
                    help="truncate tool inputs/results in text/md output (0 = no limit)")
    args = ap.parse_args()

    files, records = merge(args.session_id, args.projects_dir.expanduser())

    if args.format == "jsonl":
        result = render_jsonl(records)
    else:
        result = render_text(records, args.format == "md", args.include_meta, args.max_tool_chars)

    if args.output:
        Path(args.output).write_text(result, encoding="utf-8")
    else:
        sys.stdout.write(result)

    agents = len(files) - sum(1 for f in files if f.name == f"{args.session_id}.jsonl")
    print(f"merged {len(records)} entries from {len(files)} file(s) "
          f"({agents} agent transcript(s))", file=sys.stderr)


if __name__ == "__main__":
    main()
