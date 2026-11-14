"""
Performance baseline for effect/dataframe: H2O.ai db-benchmark style group-by
and join queries, run with Polars and pandas on the same data the TypeScript
benchmark reads (benchmark/dataframe/h2o.ts).

    python h2o.py generate --rows 1000000 [--data DIR]   # writes Arrow IPC files
    python h2o.py run [--data DIR] [--reps 3]             # writes DIR/baseline-<rows>.json

`run` times every query with Polars (all threads and one thread, each in its
own process) and pandas, and records a checksum of every result so the
TypeScript side can check it computed the same thing before comparing times.

Group-by data follows db-benchmark's groupby-datagen (K = 100 groups for
id1/id2/id4/id5, N/K for id3/id6). Integer columns are Int32 on every side.
The join queries are db-benchmark-style (small/medium/big right tables) on
synthetic keys; see JOIN_QUERIES.
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).parent
DEFAULT_DATA = HERE / ".data"


def generate(rows, data):
    import numpy as np
    import pyarrow as pa
    import pyarrow.ipc as ipc

    rng = np.random.default_rng(20261114)
    n = rows
    k = 100
    data.mkdir(parents=True, exist_ok=True)

    def ids(fmt, count, size):
        pool = np.array([fmt % (i + 1) for i in range(count)], dtype=object)
        return pa.array(pool[rng.integers(0, count, size)], type=pa.string())

    v3_pool = np.round(rng.uniform(0, 100, 100), 6)
    groupby = pa.table({
        "id1": ids("id%03d", k, n),
        "id2": ids("id%03d", k, n),
        "id3": ids("id%010d", n // k, n),
        "id4": pa.array(rng.integers(1, k + 1, n), type=pa.int32()),
        "id5": pa.array(rng.integers(1, k + 1, n), type=pa.int32()),
        "id6": pa.array(rng.integers(1, n // k + 1, n), type=pa.int32()),
        "v1": pa.array(rng.integers(1, 6, n), type=pa.int32()),
        "v2": pa.array(rng.integers(1, 16, n), type=pa.int32()),
        "v3": pa.array(v3_pool[rng.integers(0, 100, n)], type=pa.float64()),
    })
    write(groupby, data / f"groupby-{rows}.arrow")

    x_id2 = rng.integers(1, 10_001, n)
    x = pa.table({
        "id1": pa.array(rng.integers(1, 11, n), type=pa.int32()),
        "id2": pa.array(x_id2, type=pa.int32()),
        "id3": pa.array(rng.integers(1, n + 1, n), type=pa.int32()),
        "id5": pa.array(np.array([f"id{i}" for i in range(10_001)], dtype=object)[x_id2], type=pa.string()),
        "v1": pa.array(np.round(rng.uniform(0, 100, n), 6), type=pa.float64()),
    })
    small = pa.table({"id1": pa.array(np.arange(1, 11), type=pa.int32()), "v2": pa.array(rng.uniform(0, 100, 10))})
    medium_ids = np.arange(1, 10_001)
    medium = pa.table({
        "id2": pa.array(medium_ids, type=pa.int32()),
        "id5": pa.array([f"id{i}" for i in medium_ids], type=pa.string()),
        "v2": pa.array(rng.uniform(0, 100, 10_000)),
    })
    big = pa.table({"id3": pa.array(rng.permutation(n) + 1, type=pa.int32()), "v2": pa.array(rng.uniform(0, 100, n))})
    for name, t in [("x", x), ("small", small), ("medium", medium), ("big", big)]:
        write(t, data / f"join-{name}-{rows}.arrow")
    print(f"wrote {rows} rows to {data}")


def write(table, path):
    import pyarrow.ipc as ipc

    with ipc.new_file(str(path), table.schema) as w:
        w.write_table(table)


# ---------------------------------------------------------------------------
# Queries (Polars)
# ---------------------------------------------------------------------------


def polars_queries(pl):
    c = pl.col
    gb = lambda df, keys, *aggs: df.group_by(keys, maintain_order=True).agg(*aggs)
    return {
        "q1 sum v1 by id1": lambda t: gb(t["g"], ["id1"], c("v1").sum()),
        "q2 sum v1 by id1:id2": lambda t: gb(t["g"], ["id1", "id2"], c("v1").sum()),
        "q3 sum v1, mean v3 by id3": lambda t: gb(t["g"], ["id3"], c("v1").sum(), c("v3").mean()),
        "q4 mean v1:v3 by id4": lambda t: gb(t["g"], ["id4"], c("v1").mean(), c("v2").mean(), c("v3").mean()),
        "q5 sum v1:v3 by id6": lambda t: gb(t["g"], ["id6"], c("v1").sum(), c("v2").sum(), c("v3").sum()),
        "q6 median, sd v3 by id4:id5": lambda t: gb(t["g"], ["id4", "id5"], c("v3").median().alias("median"), c("v3").std().alias("sd")),
        "q7 max v1 - min v2 by id3": lambda t: gb(t["g"], ["id3"], (c("v1").max() - c("v2").min()).alias("range")),
        "q10 sum v3, count by id1:id6": lambda t: gb(t["g"], ["id1", "id2", "id3", "id4", "id5", "id6"], c("v3").sum(), pl.len()),
        "filter v3 > 50, sum v3": lambda t: t["g"].filter(c("v3") > 50).select(c("v3").sum()),
        "sort by v3 desc, id6": lambda t: t["g"].sort(["v3", "id6"], descending=[True, False], maintain_order=True),
        "top 10 by v3 desc, id6": lambda t: t["g"].lazy().sort(["v3", "id6"], descending=[True, False], maintain_order=True).head(10).collect(),
        "j1 inner small on id1": lambda t: t["x"].join(t["small"], on="id1", how="inner", maintain_order="left_right"),
        "j2 inner medium on id2": lambda t: t["x"].join(t["medium"].drop("id5"), on="id2", how="inner", maintain_order="left_right"),
        "j3 left medium on id2": lambda t: t["x"].join(t["medium"].drop("id5"), on="id2", how="left", maintain_order="left_right"),
        "j4 inner medium on id5 (string)": lambda t: t["x"].drop("id2").join(t["medium"].drop("id2"), on="id5", how="inner", maintain_order="left_right"),
        "j5 inner big on id3": lambda t: t["x"].join(t["big"], on="id3", how="inner", maintain_order="left_right"),
    }


def pandas_queries(pd):
    gb = lambda df, keys, spec: df.groupby(keys, sort=False, observed=True).agg(**spec).reset_index()
    return {
        "q1 sum v1 by id1": lambda t: gb(t["g"], ["id1"], {"v1": ("v1", "sum")}),
        "q2 sum v1 by id1:id2": lambda t: gb(t["g"], ["id1", "id2"], {"v1": ("v1", "sum")}),
        "q3 sum v1, mean v3 by id3": lambda t: gb(t["g"], ["id3"], {"v1": ("v1", "sum"), "v3": ("v3", "mean")}),
        "q4 mean v1:v3 by id4": lambda t: gb(t["g"], ["id4"], {"v1": ("v1", "mean"), "v2": ("v2", "mean"), "v3": ("v3", "mean")}),
        "q5 sum v1:v3 by id6": lambda t: gb(t["g"], ["id6"], {"v1": ("v1", "sum"), "v2": ("v2", "sum"), "v3": ("v3", "sum")}),
        "q6 median, sd v3 by id4:id5": lambda t: gb(t["g"], ["id4", "id5"], {"median": ("v3", "median"), "sd": ("v3", "std")}),
        "q7 max v1 - min v2 by id3": lambda t: (lambda r: r.assign(range=r["v1"] - r["v2"])[["id3", "range"]])(
            gb(t["g"], ["id3"], {"v1": ("v1", "max"), "v2": ("v2", "min")})),
        "q10 sum v3, count by id1:id6": lambda t: gb(t["g"], ["id1", "id2", "id3", "id4", "id5", "id6"], {"v3": ("v3", "sum"), "len": ("v1", "size")}),
        "filter v3 > 50, sum v3": lambda t: t["g"]["v3"][t["g"]["v3"] > 50].sum(),
        "sort by v3 desc, id6": lambda t: t["g"].sort_values(["v3", "id6"], ascending=[False, True], kind="stable"),
        "top 10 by v3 desc, id6": lambda t: t["g"].sort_values(["v3", "id6"], ascending=[False, True], kind="stable").head(10),
        "j1 inner small on id1": lambda t: t["x"].merge(t["small"], on="id1", how="inner"),
        "j2 inner medium on id2": lambda t: t["x"].merge(t["medium"].drop(columns="id5"), on="id2", how="inner"),
        "j3 left medium on id2": lambda t: t["x"].merge(t["medium"].drop(columns="id5"), on="id2", how="left"),
        "j4 inner medium on id5 (string)": lambda t: t["x"].drop(columns="id2").merge(t["medium"].drop(columns="id2"), on="id5", how="inner"),
        "j5 inner big on id3": lambda t: t["x"].merge(t["big"], on="id3", how="inner"),
    }


def checksum_polars(df):
    import polars as pl

    if not isinstance(df, pl.DataFrame):
        return {"rows": 1, "sum": float(df)}
    total = 0.0
    for name, dtype in df.schema.items():
        if dtype.is_numeric():
            s = df.get_column(name).cast(pl.Float64).fill_nan(None).sum()
            total += s or 0.0
    return {"rows": df.height, "sum": total}


def load_polars(pl, data, rows):
    read = lambda name: pl.read_ipc(data / name)
    return {
        "g": read(f"groupby-{rows}.arrow"),
        "x": read(f"join-x-{rows}.arrow"),
        "small": read(f"join-small-{rows}.arrow"),
        "medium": read(f"join-medium-{rows}.arrow"),
        "big": read(f"join-big-{rows}.arrow"),
    }


def time_best(f, reps):
    best = float("inf")
    result = None
    for _ in range(reps):
        start = time.perf_counter()
        result = f()
        best = min(best, time.perf_counter() - start)
    return best * 1000, result


def run_polars(data, rows, reps):
    import polars as pl

    tables = load_polars(pl, data, rows)
    out = {"version": pl.__version__, "threads": pl.thread_pool_size(), "queries": {}}
    for name, q in polars_queries(pl).items():
        ms, result = time_best(lambda: q(tables), reps)
        out["queries"][name] = {"ms": ms, "checksum": checksum_polars(result)}
    return out


def run_pandas(data, rows, reps):
    import pandas as pd
    import pyarrow.ipc as ipc

    read = lambda name: ipc.open_file(str(data / name)).read_all().to_pandas()
    tables = {
        "g": read(f"groupby-{rows}.arrow"),
        "x": read(f"join-x-{rows}.arrow"),
        "small": read(f"join-small-{rows}.arrow"),
        "medium": read(f"join-medium-{rows}.arrow"),
        "big": read(f"join-big-{rows}.arrow"),
    }
    out = {"version": pd.__version__, "queries": {}}
    for name, q in pandas_queries(pd).items():
        ms, _ = time_best(lambda: q(tables), reps)
        out["queries"][name] = {"ms": ms}
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["generate", "run", "polars", "pandas"])
    parser.add_argument("--rows", type=int, default=1_000_000)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--reps", type=int, default=3)
    args = parser.parse_args()
    if args.command == "generate":
        generate(args.rows, args.data)
    elif args.command in ("polars", "pandas"):
        result = run_polars(args.data, args.rows, args.reps) if args.command == "polars" else run_pandas(args.data, args.rows, args.reps)
        print(json.dumps(result))
    else:
        def child(command, env=None):
            out = subprocess.run(
                [sys.executable, __file__, command, "--rows", str(args.rows), "--data", str(args.data), "--reps", str(args.reps)],
                check=True, capture_output=True, text=True, env={**os.environ, **(env or {})},
            )
            return json.loads(out.stdout)

        baseline = {
            "rows": args.rows,
            "machine": {"cpus": os.cpu_count(), "platform": sys.platform},
            "polars": child("polars"),
            "polars1": child("polars", {"POLARS_MAX_THREADS": "1"}),
            "pandas": child("pandas"),
        }
        path = args.data / f"baseline-{args.rows}.json"
        path.write_text(json.dumps(baseline, indent=2) + "\n")
        print(f"wrote {path}")
        for name, q in baseline["polars"]["queries"].items():
            print(f"{name:36} polars {q['ms']:9.1f} ms  polars(1t) {baseline['polars1']['queries'][name]['ms']:9.1f} ms  pandas {baseline['pandas']['queries'][name]['ms']:9.1f} ms")


if __name__ == "__main__":
    main()
