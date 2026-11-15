"""
Cross-checks the SQL engine: runs every gold plan, compiled to DuckDB SQL by
compile_sql.ts, in DuckDB over the gold inputs, and compares the rows with
the Polars result.

    node test/fixtures/dataframe/compile_sql.ts duckdb
    python test/fixtures/dataframe/sql_oracle.py

Types are not compared (SQL engines widen integers and counts); values are,
in row order, floats with a relative tolerance. Prints a summary and writes
.sql/sql-duckdb-report.json (git-ignored) with every difference.
"""

import json
import math
import sys
from decimal import Decimal
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).parent))
import generate_gold as g  # noqa: E402

HERE = Path(__file__).parent


def load(name):
    return json.loads((HERE / "gold" / f"{name}.json").read_text())["cases"]


def same(a, b):
    if a is None or b is None:
        return a is None and b is None
    if isinstance(b, list):
        return isinstance(a, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(b, dict):
        return isinstance(a, dict) and all(same(a.get(k), v) for k, v in b.items())
    if isinstance(b, bool) or isinstance(a, bool):
        return bool(a) == bool(b) and type(a) is type(b)
    if isinstance(b, (int, float, Decimal)) and isinstance(a, (int, float, Decimal)):
        a, b = float(a), float(b)
        if math.isnan(a) or math.isnan(b):
            return math.isnan(a) and math.isnan(b)
        if a == b:
            return True
        return math.isfinite(a) and math.isfinite(b) and abs(a - b) <= 1e-9 * max(abs(a), abs(b))
    return a == b


def expected_rows(table):
    names = [f["name"] for f in table["fields"]]
    types = {f["name"]: f["type"] for f in table["fields"]}
    n = len(table["columns"][names[0]]) if names else 0
    rows = []
    for i in range(n):
        row = {}
        for name in names:
            v = table["columns"][name][i]
            t = types[name]
            row[name] = g.decode_value(v, t) if t not in g.TEMPORAL else v
        rows.append(row)
    return names, types, rows


def temporal_int(v, t):
    """Gold temporal values are epoch integers; DuckDB returns Python objects."""
    import datetime as dt
    if v is None:
        return None
    if t == "date":
        return (v - dt.date(1970, 1, 1)).days
    if t.startswith("datetime"):
        us = int((v - dt.datetime(1970, 1, 1)) / dt.timedelta(microseconds=1))
        return us if t.endswith("[us]") else us // 1000
    if t.startswith("duration"):
        us = int(v / dt.timedelta(microseconds=1))
        return us if t.endswith("[us]") else us // 1000
    return v


def run_case(case, compiled):
    con = duckdb.connect()
    con.execute("SET threads = 1")
    con.execute("SET preserve_insertion_order = true")
    for name, table in case["inputs"].items():
        df = g.to_polars(table)
        con.register(f"_{name}", df)
        con.execute(f'CREATE TABLE "{name}" AS SELECT * FROM "_{name}"')
    result = con.execute(compiled["sql"])
    columns = [d[0] for d in result.description]
    got = [dict(zip(columns, row)) for row in result.fetchall()]
    names, types, want = expected_rows(case["expected"])
    if columns != names:
        return f"columns {columns}, expected {names}"
    if len(got) != len(want):
        return f"{len(got)} rows, expected {len(want)}"
    for i, (a, b) in enumerate(zip(got, want)):
        for name in names:
            x = a[name]
            if types[name] in g.TEMPORAL:
                x = temporal_int(x, types[name])
            if not same(x, b[name]):
                return f"row {i} column {name}: got {x!r}, expected {b[name]!r}"
    return None


def main():
    cases = {c["id"]: c for name in ("spec", "random", "extended") for c in load(name)}
    compiled = json.loads((HERE / ".sql" / "sql-duckdb.json").read_text())
    report = {"pass": [], "fail": {}, "unsupported": {}, "error": {}}
    for c in compiled:
        if "error" in c:
            report["unsupported"][c["id"]] = c["error"]
            continue
        try:
            diff = run_case(cases[c["id"]], c)
        except Exception as e:  # DuckDB rejected the SQL or raised at run time
            report["error"][c["id"]] = f"{type(e).__name__}: {str(e)[:300]}"
            continue
        if diff is None:
            report["pass"].append(c["id"])
        else:
            report["fail"][c["id"]] = diff
    (HERE / ".sql" / "sql-duckdb-report.json").write_text(json.dumps(report, indent=1) + "\n")
    print(
        f"duckdb {duckdb.__version__}: {len(report['pass'])} pass, {len(report['fail'])} differ, "
        f"{len(report['error'])} errors, {len(report['unsupported'])} unsupported"
    )


if __name__ == "__main__":
    main()
