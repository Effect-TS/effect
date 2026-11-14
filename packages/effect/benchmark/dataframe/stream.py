"""
Streaming benchmark, Polars side: the queries of stream.ts, in memory
(read_ipc then query) and with Polars' streaming engine (scan_ipc ...
collect(engine="streaming")), each in its own process so peak memory is
per query.

    python benchmark/dataframe/stream.py generate --rows 1000000   # batched files
    python benchmark/dataframe/stream.py run --rows 1000000         # writes .data/stream-baseline-<rows>.json
"""

import argparse
import json
import resource
import subprocess
import sys
import time
from pathlib import Path

import polars as pl

DATA = Path(__file__).parent / ".data"
BATCH = 65_536

c = pl.col
QUERIES = {
    "s1 sum v1 by id1": lambda t: t.group_by("id1", maintain_order=True).agg(c("v1").sum()),
    "s3 sum v1, mean v3 by id3": lambda t: t.group_by("id3", maintain_order=True).agg(c("v1").sum(), c("v3").mean()),
    "s10 sum v3, count by id1:id6": lambda t: t.group_by(["id1", "id2", "id3", "id4", "id5", "id6"], maintain_order=True).agg(c("v3").sum(), pl.len().alias("n")),
    "filter v3 > 50, sum v3": lambda t: t.filter(c("v3") > 50).select(c("v3").sum()),
    "first 10 with id4 = 7": lambda t: t.filter(c("id4") == 7).head(10),
    "top 10 by v3": lambda t: t.sort("v3", descending=True, maintain_order=True).head(10),
}


def generate(rows):
    df = pl.read_ipc(DATA / f"groupby-{rows}.arrow")
    batched = pl.concat([df.slice(i, BATCH) for i in range(0, df.height, BATCH)], rechunk=False)
    batched.write_ipc(DATA / f"groupby-{rows}-batched.arrow", compat_level=pl.CompatLevel.oldest())
    batched.write_ipc_stream(DATA / f"groupby-{rows}.arrows", compat_level=pl.CompatLevel.oldest())
    print(f"wrote {batched.n_chunks()} batches of {BATCH} rows")


def measure(rows, mode, name, reps):
    """Runs one query in this process; prints {ms, peakMB}."""
    query = QUERIES[name]
    base = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    best = float("inf")
    for _ in range(reps):
        start = time.perf_counter()
        if mode == "memory":
            out = query(pl.read_ipc(DATA / f"groupby-{rows}-batched.arrow", memory_map=False) if False else pl.read_ipc(DATA / f"groupby-{rows}-batched.arrow")).height
        else:
            out = query(pl.scan_ipc(DATA / f"groupby-{rows}-batched.arrow")).collect(engine="streaming").height
        best = min(best, (time.perf_counter() - start) * 1000)
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    print(json.dumps({"ms": best, "peakMB": (peak - base) / 1024, "rows": out}))


def run(rows, reps):
    out = {"polars": pl.__version__, "queries": {}}
    for name in QUERIES:
        out["queries"][name] = {}
        for mode in ("memory", "streaming"):
            r = subprocess.run(
                [sys.executable, "-I", __file__, "measure", "--rows", str(rows), "--mode", mode, "--name", name, "--reps", str(reps)],
                capture_output=True, text=True, check=True,
            )
            out["queries"][name][mode] = json.loads(r.stdout.strip().splitlines()[-1])
            m = out["queries"][name][mode]
            print(f"{name:32} polars {mode:9} {m['ms']:8.1f} ms  peak +{m['peakMB']:7.1f} MB")
    (DATA / f"stream-baseline-{rows}.json").write_text(json.dumps(out, indent=2) + "\n")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["generate", "run", "measure"])
    p.add_argument("--rows", type=int, default=1_000_000)
    p.add_argument("--reps", type=int, default=3)
    p.add_argument("--mode")
    p.add_argument("--name")
    a = p.parse_args()
    if a.command == "generate":
        generate(a.rows)
    elif a.command == "run":
        run(a.rows, a.reps)
    else:
        measure(a.rows, a.mode, a.name, a.reps)
