"""
Gold corpus for the effect/dataframe oracle.

Every case is a small input table (or two), a pipeline written in a neutral
JSON plan language, and the result Python Polars produces for that pipeline.
The TypeScript oracle (test/dataframe/oracle) replays each plan through the
public effect/dataframe API and compares the result with the Polars output.

    python generate_gold.py            # writes gold/spec.json and gold/random.json

Needs polars (tested with 2.1). Polars is the semantic reference: where
effect/dataframe deliberately differs, the case is left out here and the
difference is listed in DEVIATIONS below.
"""

import json
import math
import random
import sys
from pathlib import Path

import polars as pl

HERE = Path(__file__).parent

# Deliberate differences from Polars. Cases that would exercise them are not
# generated.
DEVIATIONS = [
    "JavaScript has no float literal distinct from an integer: an integral number literal behaves like a Polars integer literal (it takes the integer type of the column it meets), so cases never combine an integer column with an integral float literal.",
    "Float to string casts use JavaScript number formatting (Polars prints 5.0 as '5.0', JavaScript as '5').",
    "Joins never add '_right' suffixes: overlapping non-key columns are a type error.",
    "Arithmetic between 64-bit integers (bigint) and other numeric types requires an explicit cast.",
]

# ---------------------------------------------------------------------------
# Types and value encoding
# ---------------------------------------------------------------------------

DTYPES = {
    "bool": pl.Boolean,
    "i8": pl.Int8,
    "i16": pl.Int16,
    "i32": pl.Int32,
    "i64": pl.Int64,
    "u8": pl.UInt8,
    "u16": pl.UInt16,
    "u32": pl.UInt32,
    "u64": pl.UInt64,
    "f32": pl.Float32,
    "f64": pl.Float64,
    "utf8": pl.String,
    "null": pl.Null,
    "date": pl.Date,
    "datetime[us]": pl.Datetime("us"),
    "datetime[ms]": pl.Datetime("ms"),
    "duration[us]": pl.Duration("us"),
    "duration[ms]": pl.Duration("ms"),
}

# Temporal columns travel as their epoch integers (days, or units since the
# epoch): exact, and independent of how either side represents them.
TEMPORAL = {"date": pl.Int32, "datetime[us]": pl.Int64, "datetime[ms]": pl.Int64, "duration[us]": pl.Int64, "duration[ms]": pl.Int64}


def split_top(s):
    """Splits on commas outside angle brackets."""
    parts, depth, cur = [], 0, ""
    for ch in s:
        if ch == "<":
            depth += 1
        elif ch == ">":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    if cur:
        parts.append(cur)
    return parts


def dtype_of(name):
    if name.startswith("decimal["):
        p, sc = name[8:-1].split(",")
        return pl.Decimal(int(p), int(sc))
    if name.startswith("list<"):
        return pl.List(dtype_of(name[5:-1]))
    if name.startswith("struct<"):
        return pl.Struct({f.split(":", 1)[0]: dtype_of(f.split(":", 1)[1]) for f in split_top(name[7:-1])})
    return DTYPES[name]


def type_name(dtype):
    if isinstance(dtype, pl.Decimal):
        return f"decimal[{dtype.precision},{dtype.scale}]"
    if isinstance(dtype, pl.List):
        return f"list<{type_name(dtype.inner)}>"
    if isinstance(dtype, pl.Struct):
        return "struct<" + ",".join(f"{f.name}:{type_name(f.dtype)}" for f in dtype.fields) + ">"
    for name, d in DTYPES.items():
        if dtype == d:
            return name
    raise ValueError(f"unsupported dtype {dtype}")


def encode_value(value, t):
    if value is None:
        return None
    if t.startswith("decimal["):
        return str(value)
    if t.startswith("list<"):
        return [encode_value(v, t[5:-1]) for v in value]
    if t.startswith("struct<"):
        fields = [f.split(":", 1) for f in split_top(t[7:-1])]
        return {n: encode_value(value.get(n), ft) for n, ft in fields}
    if t in ("f32", "f64"):
        if math.isnan(value):
            return "NaN"
        if math.isinf(value):
            return "Infinity" if value > 0 else "-Infinity"
        if value == 0 and math.copysign(1.0, value) < 0:
            return "-0"
        return value
    if t in ("i64", "u64"):
        return str(value)
    return value


def decode_value(value, t):
    if value is None:
        return None
    if t.startswith("decimal["):
        from decimal import Decimal as PyDecimal
        return PyDecimal(value)
    if t.startswith("list<"):
        return [decode_value(v, t[5:-1]) for v in value]
    if t.startswith("struct<"):
        fields = [f.split(":", 1) for f in split_top(t[7:-1])]
        return {n: decode_value(value.get(n), ft) for n, ft in fields}
    if t in ("f32", "f64"):
        if isinstance(value, str):
            return {"NaN": float("nan"), "Infinity": float("inf"), "-Infinity": float("-inf"), "-0": -0.0}[value]
        return float(value)
    if t in ("i64", "u64"):
        return int(value)
    return value


def table(fields, columns):
    """fields: [(name, type)], columns: {name: [python values]}"""
    return {
        "fields": [{"name": n, "type": t} for n, t in fields],
        "columns": {n: [encode_value(v, t) for v in columns[n]] for n, t in fields},
    }


def to_polars(t):
    columns = []
    for f in t["fields"]:
        values = [decode_value(v, f["type"]) for v in t["columns"][f["name"]]]
        if f["type"] in TEMPORAL:
            columns.append(pl.Series(f["name"], values, dtype=TEMPORAL[f["type"]]).cast(DTYPES[f["type"]]))
        else:
            columns.append(pl.Series(f["name"], values, dtype=dtype_of(f["type"])))
    return pl.DataFrame(columns)


def from_polars(df):
    fields = [(name, type_name(dtype)) for name, dtype in df.schema.items()]
    def values(name, t):
        series = df.get_column(name)
        return (series.cast(TEMPORAL[t]) if t in TEMPORAL else series).to_list()
    return table(fields, {name: values(name, t) for name, t in fields})


# ---------------------------------------------------------------------------
# Plan language -> Polars
# ---------------------------------------------------------------------------


def lit(value, t=None):
    out = {"lit": encode_value(value, t or ("f64" if isinstance(value, float) else "")) if value is not None else None}
    if t is not None:
        out["type"] = t
    return out


def col(name):
    return {"col": name}


def fn(name, *args, **params):
    return {"fn": name, "args": list(args), **params}


def agg(name, arg=None):
    return {"agg": name} if arg is None else {"agg": name, "arg": arg}


def p_lit(e):
    t = e.get("type")
    v = e["lit"]
    if t is not None and t.startswith("decimal["):
        return pl.lit(decode_value(v, t), dtype=dtype_of(t))
    if t is not None and t in TEMPORAL:
        return pl.lit(decode_value(v, t), dtype=TEMPORAL[t]).cast(DTYPES[t])
    if t is not None:
        return pl.lit(decode_value(v, t), dtype=DTYPES[t])
    if isinstance(v, str) and v in ("NaN", "Infinity", "-Infinity", "-0"):
        return pl.lit(decode_value(v, "f64"))
    return pl.lit(v)


def p_expr(e):
    if "over" in e:
        return p_expr(e["over"]).over([p_expr(k) for k in e["partitionBy"]])
    if "col" in e:
        return pl.col(e["col"])
    if "lit" in e:
        return p_lit(e)
    if "agg" in e:
        return p_agg(e)
    f = e["fn"]
    a = [p_expr(x) for x in e["args"]]
    binary = {
        "add": lambda: a[0] + a[1],
        "sub": lambda: a[0] - a[1],
        "mul": lambda: a[0] * a[1],
        "div": lambda: a[0] / a[1],
        "floorDiv": lambda: a[0] // a[1],
        "mod": lambda: a[0] % a[1],
        "eq": lambda: a[0] == a[1],
        "neq": lambda: a[0] != a[1],
        "lt": lambda: a[0] < a[1],
        "lte": lambda: a[0] <= a[1],
        "gt": lambda: a[0] > a[1],
        "gte": lambda: a[0] >= a[1],
        "and": lambda: a[0] & a[1],
        "or": lambda: a[0] | a[1],
    }
    if f in binary:
        return binary[f]()
    if f == "neg":
        return -a[0]
    if f == "abs":
        return a[0].abs()
    if f == "not":
        return ~a[0]
    if f == "isNull":
        return a[0].is_null()
    if f == "isNotNull":
        return a[0].is_not_null()
    if f == "isNaN":
        return a[0].is_nan()
    if f == "fillNull":
        return a[0].fill_null(a[1])
    if f == "coalesce":
        return pl.coalesce(a)
    if f == "when":
        return pl.when(a[0]).then(a[1]).otherwise(a[2])
    if f == "cast":
        return a[0].cast(dtype_of(e["to"]), strict=False)
    if f == "isIn":
        return a[0].is_in([decode_value(v, e.get("type", "")) for v in e["values"]])
    if f == "between":
        return a[0].is_between(a[1], a[2])
    if f == "round":
        return a[0].round(e.get("decimals", 0))
    if f == "sqrt":
        return a[0].sqrt()
    if f == "strLength":
        return a[0].str.len_chars()
    if f == "strLower":
        return a[0].str.to_lowercase()
    if f == "strUpper":
        return a[0].str.to_uppercase()
    if f == "strContains":
        return a[0].str.contains(e["pattern"], literal=True)
    if f == "strStartsWith":
        return a[0].str.starts_with(e["prefix"])
    if f == "strEndsWith":
        return a[0].str.ends_with(e["suffix"])
    if f == "strConcat":
        return pl.concat_str(a)
    window = {
        "cumSum": lambda: a[0].cum_sum(),
        "cumMin": lambda: a[0].cum_min(),
        "cumMax": lambda: a[0].cum_max(),
        "cumCount": lambda: a[0].cum_count(),
        "shift": lambda: a[0].shift(e.get("n", 1)),
        "diff": lambda: a[0].diff(e.get("n", 1)),
        "rank": lambda: a[0].rank(method=e.get("method", "average"), descending=e.get("descending", False)),
        "rollingSum": lambda: a[0].rolling_sum(e["window"], min_samples=e.get("minPeriods")),
        "rollingMean": lambda: a[0].rolling_mean(e["window"], min_samples=e.get("minPeriods")),
        "rollingMin": lambda: a[0].rolling_min(e["window"], min_samples=e.get("minPeriods")),
        "rollingMax": lambda: a[0].rolling_max(e["window"], min_samples=e.get("minPeriods")),
    }
    if f in window:
        return window[f]()
    temporal = {
        "year": lambda: a[0].dt.year(),
        "month": lambda: a[0].dt.month(),
        "day": lambda: a[0].dt.day(),
        "hour": lambda: a[0].dt.hour(),
        "minute": lambda: a[0].dt.minute(),
        "second": lambda: a[0].dt.second(),
        "millisecond": lambda: a[0].dt.millisecond(),
        "weekday": lambda: a[0].dt.weekday(),
        "ordinalDay": lambda: a[0].dt.ordinal_day(),
        "truncate": lambda: a[0].dt.truncate(e["every"]),
        "totalDays": lambda: a[0].dt.total_days(),
        "totalHours": lambda: a[0].dt.total_hours(),
        "totalMinutes": lambda: a[0].dt.total_minutes(),
        "totalSeconds": lambda: a[0].dt.total_seconds(),
        "totalMilliseconds": lambda: a[0].dt.total_milliseconds(),
    }
    if f in temporal:
        return temporal[f]()
    nested = {
        "listLength": lambda: a[0].list.len(),
        "listGet": lambda: a[0].list.get(e["index"], null_on_oob=True),
        "listSum": lambda: a[0].list.sum(),
        "listMean": lambda: a[0].list.mean(),
        "listMin": lambda: a[0].list.min(),
        "listMax": lambda: a[0].list.max(),
        "listContains": lambda: a[0].list.contains(a[1]),
        "field": lambda: a[0].struct.field(e["field"]),
        "struct": lambda: pl.struct([x.alias(n) for x, n in zip(a, e["names"])]),
    }
    if f in nested:
        return nested[f]()
    raise ValueError(f"unknown function {f}")


def p_agg(e, grouped=False):
    name = e["agg"]
    if name == "len":
        return pl.len()
    x = p_expr(e["arg"])
    if name == "list":
        return x if grouped else x.implode()
    return {
        "sum": x.sum,
        "mean": x.mean,
        "min": x.min,
        "max": x.max,
        "count": x.count,
        "first": x.first,
        "last": x.last,
        "nUnique": x.n_unique,
        "std": x.std,
        "var": x.var,
        "median": x.median,
    }[name]()


def run(inputs, ops):
    frames = {name: to_polars(t) for name, t in inputs.items()}
    df = frames["left"]
    for op in ops:
        kind = op["op"]
        if kind == "filter":
            df = df.filter(p_expr(op["predicate"]))
        elif kind == "select":
            df = df.select([p_expr(e).alias(n) for n, e in op["exprs"].items()])
        elif kind == "withColumns":
            df = df.with_columns([p_expr(e).alias(n) for n, e in op["exprs"].items()])
        elif kind == "pick":
            df = df.select(op["columns"])
        elif kind == "omit":
            df = df.drop(op["columns"])
        elif kind == "rename":
            df = df.rename(op["mapping"])
        elif kind == "sort":
            df = df.sort(
                [p_expr(k["expr"]) for k in op["keys"]],
                descending=[k.get("descending", False) for k in op["keys"]],
                nulls_last=op.get("nullsLast", False),
                maintain_order=True,
            )
        elif kind == "head":
            df = df.head(op["n"])
        elif kind == "tail":
            df = df.tail(op["n"])
        elif kind == "slice":
            df = df.slice(op["offset"], op.get("length"))
        elif kind == "groupBy":
            df = df.group_by(op["keys"], maintain_order=True).agg(
                [p_agg(a, grouped=True).alias(n) for n, a in op["aggs"].items()]
            )
        elif kind == "agg":
            df = df.select([p_agg(a).alias(n) for n, a in op["aggs"].items()])
        elif kind == "join":
            right = frames[op["right"]]
            how = op["how"]
            kw = {}
            if how in ("inner", "left", "full"):
                kw["maintain_order"] = "left_right"
            if how == "full":
                kw["coalesce"] = True
            df = df.join(right, on=op["on"], how=how, **kw)
        elif kind == "unique":
            df = df.unique(subset=op.get("columns"), keep="first", maintain_order=True)
        elif kind == "concat":
            df = pl.concat([df, frames[op["with"]]], how="vertical")
        elif kind == "dropNulls":
            df = df.drop_nulls(subset=op.get("columns"))
        elif kind == "pivot":
            df = df.pivot(on=op["on"], index=op["index"], values=op["values"], aggregate_function=op["aggregate"], sort_columns=False)
            if "columns" in op:
                # Declared columns that never occur are cells without rows:
                # the aggregate of an empty set (0 for sums and counts).
                empty = run({"left": inputs["left"]}, [o for o in ops[: ops.index(op)]]).clear().select(
                    p_agg(agg(op["aggregate"], col(op["values"])) if op["aggregate"] != "len" else agg("len")).alias("v")
                )
                for c in op["columns"]:
                    if c not in df.columns:
                        df = df.with_columns(pl.lit(empty.item(0, 0), dtype=empty.schema["v"]).alias(c))
                df = df.select(op["index"] + op["columns"])
        elif kind == "explode":
            df = df.explode(op["column"])
        elif kind == "unnest":
            df = df.unnest(op["column"])
        elif kind == "unpivot":
            df = df.unpivot(on=op["on"], index=op["index"], variable_name=op.get("variable", "variable"), value_name=op.get("value", "value"))
        else:
            raise ValueError(f"unknown op {kind}")
    return df


def case(id, description, inputs, ops):
    expected = run(inputs, ops)
    return {"id": id, "description": description, "inputs": inputs, "ops": ops, "expected": from_polars(expected)}


# ---------------------------------------------------------------------------
# Hand-written specification cases
# ---------------------------------------------------------------------------

NAN = float("nan")
INF = float("inf")

readings = table(
    [("station", "utf8"), ("city", "utf8"), ("temp", "f64"), ("rain", "f64"), ("count", "i32"), ("id", "i64")],
    {
        "station": ["s1", "s2", "s3", "s4", "s5", "s6", "s7"],
        "city": ["Vienna", "Vienna", "Berlin", "Berlin", "Zürich", None, "Vienna"],
        "temp": [21.5, 19.0, 24.0, 26.5, 17.0, NAN, None],
        "rain": [0.0, None, 3.5, 1.0, 7.0, 2.0, 0.5],
        "count": [3, 1, None, 7, 2, 5, 4],
        "id": [10, 20, 30, 40, 9007199254740993, -1, 0],
    },
)
stations = table(
    [("station", "utf8"), ("elevation", "f64"), ("active", "bool")],
    {"station": ["s1", "s3", "s3", "s9", None], "elevation": [190.0, 34.0, 35.0, 500.0, 1.0], "active": [True, False, None, True, True]},
)
mixed = table(
    [("a", "f64"), ("b", "f64"), ("i", "i32"), ("j", "i32"), ("s", "utf8"), ("t", "utf8"), ("p", "bool"), ("q", "bool")],
    {
        "a": [1.0, -0.0, 0.0, NAN, INF, -INF, None, 2.5, -2.5, 1e300],
        "b": [2.0, 0.0, -0.0, NAN, 1.0, None, 3.0, 0.0, 2.0, 1e300],
        "i": [7, -7, 0, 2147483647, -2147483648, None, 3, -3, 100, 5],
        "j": [2, 2, 3, 1, -1, 4, None, 2, -7, 0],
        "s": ["b", "a", "", "é", "\U0001F600", "￿", None, "B", "ab", "a\u0000b"],
        "t": ["b", "A", "x", "É", "😀", "z", "n", None, "AB", "a"],
        "p": [True, True, True, False, False, False, None, None, None, True],
        "q": [True, False, None, True, False, None, True, False, None, True],
    },
)
ints = table(
    [("i8", "i8"), ("u8", "u8"), ("i16", "i16"), ("u16", "u16"), ("u32", "u32"), ("i64", "i64"), ("u64", "u64"), ("f32", "f32")],
    {
        "i8": [127, -128, 0, None, 5],
        "u8": [255, 0, 1, None, 5],
        "i16": [32767, -32768, 0, 12, None],
        "u16": [65535, 0, 7, 12, None],
        "u32": [4294967295, 0, 1, None, 3],
        "i64": [9223372036854775807, -9223372036854775808, 0, None, 42],
        "u64": [18446744073709551615, 0, 1, None, 42],
        "f32": [1.5, -0.25, None, 3.0, 1e10],
    },
)
empty = table([("k", "utf8"), ("v", "f64")], {"k": [], "v": []})
allnull = table([("k", "utf8"), ("v", "f64"), ("i", "i32")], {"k": ["x", "x", "y"], "v": [None, None, 1.0], "i": [None, None, None]})


def spec_cases():
    R = {"left": readings}
    RS = {"left": readings, "right": stations}
    M = {"left": mixed}
    out = []
    add = lambda *a: out.append(case(*a))

    # filter
    add("filter/gt", "numeric comparison with a literal", R, [{"op": "filter", "predicate": fn("gt", col("temp"), lit(20.0))}])
    add("filter/null-is-false", "rows where the predicate is null are dropped", R, [{"op": "filter", "predicate": fn("gt", col("rain"), lit(0.5))}])
    add("filter/nan-total-order", "NaN compares greater than every number and equal to itself", M,
        [{"op": "filter", "predicate": fn("gte", col("a"), col("b"))}])
    add("filter/string-eq", "string equality", R, [{"op": "filter", "predicate": fn("eq", col("city"), lit("Vienna"))}])
    add("filter/string-order", "strings compare by code point (UTF-8 byte order)", M,
        [{"op": "filter", "predicate": fn("lt", col("s"), col("t"))}])
    add("filter/kleene", "and/or use three-valued logic", M,
        [{"op": "select", "exprs": {"and": fn("and", col("p"), col("q")), "or": fn("or", col("p"), col("q")), "not": fn("not", col("p"))}}])
    add("filter/is-null", "isNull and isNotNull", R,
        [{"op": "filter", "predicate": fn("or", fn("isNull", col("city")), fn("isNull", col("temp")))}])
    add("filter/is-in", "membership in a literal list", R,
        [{"op": "filter", "predicate": fn("isIn", col("city"), values=["Berlin", "Zürich"])}])
    add("filter/between", "inclusive range", R,
        [{"op": "filter", "predicate": fn("between", col("temp"), lit(19.0), lit(24.0))}])
    add("filter/compound", "compound predicate", R,
        [{"op": "filter", "predicate": fn("and", fn("gt", col("count"), lit(1)), fn("neq", col("city"), lit("Berlin")))}])
    add("filter/i64", "64-bit integer comparison beyond 2^53", R,
        [{"op": "filter", "predicate": fn("gt", col("id"), lit(9007199254740992, "i64"))}])
    add("filter/empty-result", "a predicate that matches nothing", R,
        [{"op": "filter", "predicate": fn("gt", col("temp"), lit(1000.0))}])
    add("filter/all-null-literal", "a null literal predicate drops everything", R,
        [{"op": "filter", "predicate": lit(None, "bool")}])

    # arithmetic
    add("arith/float", "float arithmetic with nulls, NaN and infinities", M,
        [{"op": "select", "exprs": {"add": fn("add", col("a"), col("b")), "sub": fn("sub", col("a"), col("b")),
                                     "mul": fn("mul", col("a"), col("b")), "div": fn("div", col("a"), col("b"))}}])
    add("arith/int32-wrap", "Int32 arithmetic wraps on overflow", M,
        [{"op": "select", "exprs": {"add": fn("add", col("i"), col("j")), "sub": fn("sub", col("i"), col("j")),
                                     "mul": fn("mul", col("i"), col("j")), "neg": fn("neg", col("i"))}}])
    add("arith/int32-div", "integer true division gives Float64; division by zero gives infinity", M,
        [{"op": "select", "exprs": {"div": fn("div", col("i"), col("j"))}}])
    add("arith/int32-floor", "floor division and floored modulo", M,
        [{"op": "filter", "predicate": fn("neq", col("j"), lit(0))},
         {"op": "select", "exprs": {"floor": fn("floorDiv", col("i"), col("j")), "mod": fn("mod", col("i"), col("j"))}}])
    add("arith/float-floor", "floor division and floored modulo on floats", M,
        [{"op": "select", "exprs": {"floor": fn("floorDiv", col("a"), col("b")), "mod": fn("mod", col("a"), col("b"))}}])
    add("arith/mixed", "Int32 with a float literal widens to Float64", M,
        [{"op": "select", "exprs": {"x": fn("mul", col("i"), lit(1.5)), "y": fn("add", col("i"), col("a"))}}])
    add("arith/int-literal", "an integer literal adopts the integer column type", M,
        [{"op": "select", "exprs": {"x": fn("add", col("i"), lit(1)), "y": fn("mul", col("j"), lit(3))}}])
    add("arith/abs-sqrt", "abs and sqrt", M,
        [{"op": "select", "exprs": {"abs": fn("abs", col("a")), "iabs": fn("abs", col("j")), "sqrt": fn("sqrt", col("b"))}}])
    add("arith/i64", "Int64 arithmetic", R,
        [{"op": "select", "exprs": {"x": fn("add", col("id"), lit(1, "i64")), "y": fn("mul", col("id"), lit(2, "i64")),
                                     "z": fn("sub", col("id"), col("id"))}}])
    add("arith/round", "round half to even", {"left": table([("x", "f64")], {"x": [0.5, 1.5, 2.5, -0.5, -1.5, 1.25, 2.675, None, NAN]})},
        [{"op": "select", "exprs": {"r0": fn("round", col("x")), "r1": fn("round", col("x"), decimals=1)}}])
    add("arith/small-ints", "8/16-bit arithmetic wraps in the column type", {"left": ints},
        [{"op": "select", "exprs": {"i8": fn("add", col("i8"), lit(1)), "u8": fn("add", col("u8"), lit(1)),
                                     "i16": fn("mul", col("i16"), lit(2)), "u16": fn("sub", col("u16"), lit(1)),
                                     "u32": fn("add", col("u32"), lit(1)), "f32": fn("mul", col("f32"), lit(2.0))}}])

    # null handling
    add("null/fill", "fillNull with a literal", R,
        [{"op": "select", "exprs": {"city": fn("fillNull", col("city"), lit("?")), "temp": fn("fillNull", col("temp"), lit(0.0))}}])
    add("null/coalesce", "first non-null", M,
        [{"op": "select", "exprs": {"x": fn("coalesce", col("a"), col("b"), lit(-1.0))}}])
    add("null/when", "when/then/otherwise", R,
        [{"op": "select", "exprs": {"label": fn("when", fn("gt", col("temp"), lit(20.0)), lit("warm"), lit("cold"))}}])
    add("null/drop", "drop rows with nulls", R, [{"op": "dropNulls"}])
    add("null/drop-subset", "drop rows with nulls in some columns", R, [{"op": "dropNulls", "columns": ["city"]}])
    add("null/is-nan", "isNaN is distinct from isNull", M, [{"op": "select", "exprs": {"nan": fn("isNaN", col("a"))}}])

    # casts
    add("cast/float-int", "float to Int32 truncates; out of range is null", M,
        [{"op": "select", "exprs": {"i": fn("cast", col("a"), to="i32"), "f": fn("cast", col("i"), to="f64")}}])
    add("cast/int-string", "integers to strings", M, [{"op": "select", "exprs": {"s": fn("cast", col("i"), to="utf8")}}])
    add("cast/string-number", "strings to numbers; unparsable is null",
        {"left": table([("s", "utf8")], {"s": ["1", "-2", "3.5", "x", "", None, " 4", "1e3"]})},
        [{"op": "select", "exprs": {"f": fn("cast", col("s"), to="f64"), "i": fn("cast", col("s"), to="i32")}}])
    add("cast/bool", "booleans to and from numbers", M,
        [{"op": "select", "exprs": {"b": fn("cast", col("j"), to="bool"), "n": fn("cast", col("p"), to="i32")}}])
    add("cast/i64", "Int64 to and from other types", R,
        [{"op": "select", "exprs": {"f": fn("cast", col("id"), to="f64"), "i": fn("cast", col("count"), to="i64"),
                                     "s": fn("cast", col("id"), to="utf8")}}])

    # strings
    add("str/length", "length in characters", M, [{"op": "select", "exprs": {"n": fn("strLength", col("s"))}}])
    add("str/case", "upper and lower case", M,
        [{"op": "select", "exprs": {"u": fn("strUpper", col("s")), "l": fn("strLower", col("t"))}}])
    add("str/match", "contains, startsWith, endsWith with literals", M,
        [{"op": "select", "exprs": {"c": fn("strContains", col("s"), pattern="a"), "p": fn("strStartsWith", col("t"), prefix="A"),
                                     "e": fn("strEndsWith", col("s"), suffix="b")}}])
    add("str/concat", "concatenation; null in any argument gives null", M,
        [{"op": "select", "exprs": {"c": fn("strConcat", col("s"), lit("-"), col("t"))}}])

    # projection
    add("project/pick", "pick columns in the given order", R, [{"op": "pick", "columns": ["temp", "station"]}])
    add("project/omit", "omit columns", R, [{"op": "omit", "columns": ["rain", "id"]}])
    add("project/rename", "rename columns", R, [{"op": "rename", "mapping": {"temp": "celsius", "city": "town"}}])
    add("project/with-replace", "withColumns replaces an existing column in place", R,
        [{"op": "withColumns", "exprs": {"temp": fn("mul", col("temp"), lit(2.0)), "f": fn("add", fn("mul", col("temp"), lit(1.8)), lit(32.0))}}])
    add("project/literal-column", "a literal broadcasts to every row", R,
        [{"op": "select", "exprs": {"station": col("station"), "half": lit(0.5), "one": lit(1), "tag": lit("x")}}])

    # sorting and slicing
    add("sort/asc", "ascending, nulls first, NaN last among numbers", R, [{"op": "sort", "keys": [{"expr": col("temp")}]}])
    add("sort/desc-nulls-last", "descending with nulls last", R,
        [{"op": "sort", "keys": [{"expr": col("temp"), "descending": True}], "nullsLast": True}])
    add("sort/multi", "multi-key sort is stable", R,
        [{"op": "sort", "keys": [{"expr": col("city")}, {"expr": col("count"), "descending": True}]}])
    add("sort/strings", "string sort by code point", M, [{"op": "sort", "keys": [{"expr": col("s")}]}])
    add("sort/zeros", "-0 and 0 sort as equal (stable)", M, [{"op": "sort", "keys": [{"expr": col("a")}]}])
    add("sort/i64", "Int64 sort", R, [{"op": "sort", "keys": [{"expr": col("id")}]}])
    add("sort/expr", "sort by an expression", R, [{"op": "sort", "keys": [{"expr": fn("neg", col("count"))}]}])
    add("sort/bool", "boolean sort", M, [{"op": "sort", "keys": [{"expr": col("p")}, {"expr": col("q"), "descending": True}]}])
    add("slice/head", "first rows", R, [{"op": "head", "n": 3}])
    add("slice/tail", "last rows", R, [{"op": "tail", "n": 2}])
    add("slice/offset", "slice in the middle", R, [{"op": "slice", "offset": 2, "length": 3}])
    add("slice/after-filter", "slicing after a filter", R,
        [{"op": "filter", "predicate": fn("isNotNull", col("city"))}, {"op": "slice", "offset": 1, "length": 2}])

    # aggregation
    add("agg/global", "aggregates over the whole frame", R,
        [{"op": "agg", "aggs": {"n": agg("len"), "c": agg("count", col("temp")), "sum": agg("sum", col("rain")),
                                "mean": agg("mean", col("rain")), "min": agg("min", col("count")), "max": agg("max", col("count")),
                                "first": agg("first", col("city")), "last": agg("last", col("city"))}}])
    add("agg/nan", "sum includes NaN; min and max skip it", R,
        [{"op": "agg", "aggs": {"sum": agg("sum", col("temp")), "min": agg("min", col("temp")), "max": agg("max", col("temp"))}}])
    add("agg/stats", "std, var and median", R,
        [{"op": "agg", "aggs": {"std": agg("std", col("rain")), "var": agg("var", col("rain")), "median": agg("median", col("rain")),
                                "imed": agg("median", col("count"))}}])
    add("agg/strings", "min, max and nUnique on strings", R,
        [{"op": "agg", "aggs": {"min": agg("min", col("city")), "max": agg("max", col("city")), "n": agg("nUnique", col("city"))}}])
    add("agg/empty", "aggregates over an empty frame", {"left": empty},
        [{"op": "agg", "aggs": {"n": agg("len"), "sum": agg("sum", col("v")), "mean": agg("mean", col("v")), "min": agg("min", col("v"))}}])
    add("group/basic", "group by a string key in first-appearance order", R,
        [{"op": "groupBy", "keys": ["city"], "aggs": {"n": agg("len"), "temp": agg("mean", col("temp")), "rain": agg("sum", col("rain"))}}])
    add("group/null-key", "null is its own group", R,
        [{"op": "groupBy", "keys": ["city"], "aggs": {"stations": agg("count", col("station"))}}])
    add("group/multi-key", "group by two keys", R,
        [{"op": "withColumns", "exprs": {"wet": fn("gt", col("rain"), lit(1.0))}},
         {"op": "groupBy", "keys": ["city", "wet"], "aggs": {"n": agg("len"), "max": agg("max", col("temp"))}}])
    add("group/all-null", "aggregates over all-null groups", {"left": allnull},
        [{"op": "groupBy", "keys": ["k"], "aggs": {"sum": agg("sum", col("v")), "mean": agg("mean", col("v")), "count": agg("count", col("v")),
                                                  "n": agg("len"), "min": agg("min", col("v")), "std": agg("std", col("v")),
                                                  "nu": agg("nUnique", col("v")), "first": agg("first", col("v")), "isum": agg("sum", col("i")),
                                                  "imax": agg("max", col("i"))}}])
    add("group/float-key", "NaN, -0 and 0 as group keys", M,
        [{"op": "groupBy", "keys": ["a"], "aggs": {"n": agg("len")}}])
    add("group/i64-key", "Int64 group keys and sums", R,
        [{"op": "withColumns", "exprs": {"k": fn("mod", col("id"), lit(3, "i64"))}},
         {"op": "groupBy", "keys": ["k"], "aggs": {"n": agg("len"), "s": agg("sum", col("id")), "mx": agg("max", col("id"))}}])
    add("group/bool-key", "boolean group keys", M, [{"op": "groupBy", "keys": ["p"], "aggs": {"n": agg("len"), "s": agg("sum", col("i"))}}])
    add("group/int-sum", "Int32 sums stay Int32; means are Float64", M,
        [{"op": "groupBy", "keys": ["p"], "aggs": {"s": agg("sum", col("j")), "m": agg("mean", col("j")), "mn": agg("min", col("j"))}}])
    add("group/after-filter", "group a filtered frame", R,
        [{"op": "filter", "predicate": fn("gt", col("rain"), lit(0.0))},
         {"op": "groupBy", "keys": ["city"], "aggs": {"n": agg("len"), "last": agg("last", col("station"))}}])
    add("group/expression-agg", "aggregate of an expression", R,
        [{"op": "groupBy", "keys": ["city"], "aggs": {"x": agg("sum", fn("mul", col("rain"), lit(2.0)))}}])
    add("group/empty", "grouping an empty frame", {"left": empty}, [{"op": "groupBy", "keys": ["k"], "aggs": {"n": agg("len")}}])
    add("group/small-ints", "sums of small integer types", {"left": ints},
        [{"op": "agg", "aggs": {"i8": agg("sum", col("i8")), "u8": agg("sum", col("u8")), "u32": agg("sum", col("u32")),
                                "i64": agg("sum", col("i64")), "u64": agg("max", col("u64")), "f32": agg("mean", col("f32"))}}])

    # joins
    for how in ("inner", "left", "full", "semi", "anti"):
        add(f"join/{how}", f"{how} join with duplicate and null keys", RS,
            [{"op": "pick", "columns": ["station", "temp"]}, {"op": "join", "right": "right", "on": ["station"], "how": how}])
    add("join/multi-key", "join on two keys",
        {"left": table([("a", "i32"), ("b", "utf8"), ("x", "f64")], {"a": [1, 1, 2, 2, None], "b": ["x", "y", "x", None, "x"], "x": [1.0, 2.0, 3.0, 4.0, 5.0]}),
         "right": table([("a", "i32"), ("b", "utf8"), ("y", "bool")], {"a": [1, 2, 2, 1], "b": ["y", "x", "x", "z"], "y": [True, False, True, None]})},
        [{"op": "join", "right": "right", "on": ["a", "b"], "how": "left"}])
    add("join/i64-key", "join on Int64 keys",
        {"left": table([("k", "i64"), ("x", "f64")], {"k": [9007199254740993, 9007199254740992, 1], "x": [1.0, 2.0, 3.0]}),
         "right": table([("k", "i64"), ("y", "utf8")], {"k": [9007199254740993, 1, 1], "y": ["a", "b", "c"]})},
        [{"op": "join", "right": "right", "on": ["k"], "how": "inner"}])
    add("join/f64-key", "join on Float64 keys: NaN matches NaN, -0 matches 0",
        {"left": table([("k", "f64"), ("x", "i32")], {"k": [NAN, -0.0, 1.5, None], "x": [1, 2, 3, 4]}),
         "right": table([("k", "f64"), ("y", "i32")], {"k": [0.0, NAN, None, 1.5], "y": [10, 20, 30, 40]})},
        [{"op": "join", "right": "right", "on": ["k"], "how": "inner"}])

    # unique / concat
    add("unique/all", "distinct rows, keeping the first", {"left": table([("a", "i32"), ("b", "utf8")], {"a": [1, 1, 2, None, None, 1], "b": ["x", "x", "y", None, None, "y"]})},
        [{"op": "unique"}])
    add("unique/subset", "distinct by a subset", R, [{"op": "unique", "columns": ["city"]}])
    add("concat/vertical", "stack frames with the same schema", {"left": readings, "right": readings},
        [{"op": "concat", "with": "right"}, {"op": "pick", "columns": ["station", "temp"]}])

    # pipelines
    add("pipeline/summary", "filter, derive, group, sort", R,
        [{"op": "filter", "predicate": fn("gt", col("temp"), lit(18.0))},
         {"op": "withColumns", "exprs": {"tempF": fn("add", fn("mul", col("temp"), lit(1.8)), lit(32.0))}},
         {"op": "groupBy", "keys": ["city"], "aggs": {"stations": agg("len"), "avgF": agg("mean", col("tempF")), "maxRain": agg("max", col("rain"))}},
         {"op": "sort", "keys": [{"expr": col("avgF"), "descending": True}]}])
    add("pipeline/join-group", "join then aggregate the joined columns", RS,
        [{"op": "join", "right": "right", "on": ["station"], "how": "left"},
         {"op": "groupBy", "keys": ["active"], "aggs": {"n": agg("len"), "elev": agg("mean", col("elevation"))}},
         {"op": "sort", "keys": [{"expr": col("active")}]}])
    return out


# ---------------------------------------------------------------------------
# Random differential cases
# ---------------------------------------------------------------------------

NUMERIC = ("i32", "f64")
STRINGS = ["a", "b", "c", "aa", "ab", "B", "é", "😀", "", "zz"]


def random_value(rng, t, null_rate):
    if rng.random() < null_rate:
        return None
    if t == "bool":
        return rng.random() < 0.5
    if t == "i32":
        return rng.choice([rng.randint(-5, 5), rng.randint(-1000, 1000), 2147483647, -2147483648]) if rng.random() < 0.1 else rng.randint(-5, 5)
    if t == "i64":
        return rng.choice([rng.randint(-5, 5), 2**53 + rng.randint(0, 3), -(2**62)])
    if t == "f64":
        r = rng.random()
        if r < 0.03:
            return float("nan")
        if r < 0.05:
            return rng.choice([float("inf"), float("-inf"), -0.0])
        return rng.choice([float(rng.randint(-4, 4)), round(rng.uniform(-100, 100), 3)])
    if t == "utf8":
        return rng.choice(STRINGS)
    raise ValueError(t)


def random_table(rng, prefix, n_rows, types):
    fields = [(f"{prefix}{i}_{t}", t) for i, t in enumerate(types)]
    null_rate = rng.choice([0.0, 0.1, 0.3])
    return table(fields, {name: [random_value(rng, t, null_rate) for _ in range(n_rows)] for name, t in fields})


def random_expr(rng, cols, want, depth=0):
    """cols: {name: type}; want: 'num' | 'bool' | 'utf8' | 'i64'"""
    by = lambda ts: [c for c, t in cols.items() if t in ts]
    if want == "num":
        choices = by(NUMERIC)
        if depth >= 2 or rng.random() < 0.4:
            if choices and rng.random() < 0.8:
                return col(rng.choice(choices))
            return lit(rng.choice([2, -1, 0.5, 2.5]))
        op = rng.choice(["add", "sub", "mul", "div", "neg", "abs", "fillNull", "when", "mod", "floorDiv"])
        if op in ("neg", "abs"):
            return fn(op, random_expr(rng, cols, "num", depth + 1))
        if op == "fillNull":
            return fn(op, random_expr(rng, cols, "num", depth + 1), lit(rng.choice([0, 1.5])))
        if op == "when":
            return fn("when", random_expr(rng, cols, "bool", depth + 1), random_expr(rng, cols, "num", depth + 1), random_expr(rng, cols, "num", depth + 1))
        return fn(op, random_expr(rng, cols, "num", depth + 1), random_expr(rng, cols, "num", depth + 1))
    if want == "bool":
        r = rng.random()
        if r < 0.45 and by(NUMERIC):
            return fn(rng.choice(["gt", "lt", "gte", "lte", "eq", "neq"]), random_expr(rng, cols, "num", depth + 1), random_expr(rng, cols, "num", depth + 1))
        if r < 0.6 and by(("utf8",)):
            c = col(rng.choice(by(("utf8",))))
            return rng.choice([
                fn(rng.choice(["eq", "lt", "gte"]), c, lit(rng.choice(STRINGS))),
                fn("isIn", c, values=rng.sample(STRINGS, 3)),
                fn("strStartsWith", c, prefix=rng.choice(["a", "é", ""])),
            ])
        if r < 0.7 and by(("i64",)):
            return fn(rng.choice(["gt", "eq"]), col(rng.choice(by(("i64",)))), lit(rng.randint(-3, 3), "i64"))
        if r < 0.8:
            return fn(rng.choice(["isNull", "isNotNull"]), col(rng.choice(list(cols))))
        if r < 0.9 and by(("bool",)) and depth < 2:
            return col(rng.choice(by(("bool",))))
        if depth < 2:
            return fn(rng.choice(["and", "or"]), random_expr(rng, cols, "bool", depth + 1), random_expr(rng, cols, "bool", depth + 1))
        return fn("isNull", col(rng.choice(list(cols))))
    raise ValueError(want)


AGGS_NUM = ["sum", "mean", "min", "max", "count", "first", "last", "nUnique", "std", "median"]
AGGS_ANY = ["count", "first", "last", "nUnique", "min", "max"]


def random_aggs(rng, cols, exclude, tag):
    aggs = {f"n{tag}": agg("len")}
    for i in range(rng.randint(1, 3)):
        candidates = [c for c in cols if c not in exclude]
        if not candidates:
            break
        c = rng.choice(candidates)
        t = cols[c]
        name = rng.choice(AGGS_NUM if t in NUMERIC else AGGS_ANY)
        if t == "bool" and name in ("min", "max"):
            name = "count"
        aggs[f"a{tag}_{i}"] = agg(name, col(c))
    return aggs


def schema_after(inputs, ops):
    df = run(inputs, ops)
    return {name: type_name(dtype) for name, dtype in df.schema.items()}


def random_case(rng, index):
    try:
        return random_case_unsafe(rng, index)
    except Exception as error:  # Polars rejected the plan: not a valid case
        print(f"skipping random/{index:04d}: {type(error).__name__}: {str(error)[:120]}", file=sys.stderr)
        return None


def random_case_unsafe(rng, index):
    n_rows = rng.choice([0, 1, 5, 20, 60])
    types = [rng.choice(["i32", "f64", "utf8", "bool", "i64", "f64", "utf8"]) for _ in range(rng.randint(2, 5))]
    left = random_table(rng, "l", n_rows, ["utf8", "i32"] + types)
    inputs = {"left": left}
    ops = []
    for _ in range(rng.randint(1, 4)):
        cols = schema_after(inputs, ops)
        kind = rng.choice(["filter", "withColumns", "sort", "groupBy", "join", "unique", "head", "filter", "withColumns"])
        if kind == "filter":
            ops.append({"op": "filter", "predicate": random_expr(rng, cols, "bool")})
        elif kind == "withColumns":
            ops.append({"op": "withColumns", "exprs": {f"x{len(ops)}": random_expr(rng, cols, "num") if rng.random() < 0.7 else random_expr(rng, cols, "bool")}})
        elif kind == "sort":
            keys = rng.sample(list(cols), min(len(cols), rng.randint(1, 2)))
            ops.append({"op": "sort", "keys": [{"expr": col(k), "descending": rng.random() < 0.5} for k in keys], "nullsLast": rng.random() < 0.5})
        elif kind == "groupBy":
            keys = rng.sample([c for c, t in cols.items() if t != "f64"] or list(cols), 1)
            ops.append({"op": "groupBy", "keys": keys, "aggs": random_aggs(rng, cols, keys, len(ops))})
        elif kind == "join" and "right" not in inputs:
            key_candidates = [c for c, t in cols.items() if t in ("utf8", "i32", "i64")]
            if not key_candidates:
                continue
            key = rng.choice(key_candidates)
            right = random_table(rng, "r", rng.choice([0, 3, 10, 30]), [rng.choice(["f64", "utf8", "bool"])])
            # reuse the key column's values so that rows match
            values = [v for v in inputs["left"]["columns"].get(key, [])] if key in inputs["left"]["columns"] else []
            pool = values or [encode_value(random_value(rng, cols[key], 0.2), cols[key]) for _ in range(5)]
            right["fields"].insert(0, {"name": key, "type": cols[key]})
            n = len(next(iter(right["columns"].values())))
            right["columns"][key] = [rng.choice(pool) if pool else None for _ in range(n)]
            inputs["right"] = right
            ops.append({"op": "join", "right": "right", "on": [key], "how": rng.choice(["inner", "left", "full", "semi", "anti"])})
        elif kind == "unique":
            ops.append({"op": "unique", "columns": rng.sample(list(cols), 1)} if rng.random() < 0.5 else {"op": "unique"})
        elif kind == "head":
            ops.append({"op": "head", "n": rng.randint(0, 10)})
    return case(f"random/{index:04d}", "seeded random pipeline", inputs, ops)


# ---------------------------------------------------------------------------
# Extended cases: window functions, pivots, more types
# ---------------------------------------------------------------------------

series = table(
    [("g", "utf8"), ("t", "i32"), ("x", "f64"), ("i", "i32"), ("b", "bool")],
    {
        "g": ["a", "b", "a", "a", "b", None, "a", "b", "b", "a"],
        "t": [1, 1, 2, 3, 2, 1, 4, 3, 4, 5],
        "x": [1.5, 2.0, None, 4.0, NAN, 3.0, -1.0, 2.0, 0.5, 2.0],
        "i": [3, 1, 4, 1, 5, 9, None, 6, 5, 3],
        "b": [True, False, None, True, True, False, True, None, False, True],
    },
)

from datetime import datetime, date, timedelta

EPOCH = datetime(1970, 1, 1)


def _us(dt):
    return int((dt - EPOCH).total_seconds() * 1_000_000) if dt is not None else None


def _days(d):
    return (d - date(1970, 1, 1)).days if d is not None else None


times = table(
    [("k", "utf8"), ("ts", "datetime[us]"), ("ms", "datetime[ms]"), ("d", "date"), ("dur", "duration[us]")],
    {
        "k": ["a", "b", "c", "d", "e", "f"],
        "ts": [_us(datetime(2024, 2, 29, 13, 45, 7, 123456)), _us(datetime(2023, 12, 31, 23, 59, 59, 999000)), _us(datetime(2024, 3, 4, 0, 0, 0)),
               None, _us(datetime(1969, 7, 20, 20, 17, 40)), _us(datetime(2024, 3, 10, 6, 30, 0, 500))],
        "ms": [_us(datetime(2024, 2, 29, 13, 45, 7, 123000)) // 1000, _us(datetime(2024, 1, 1)) // 1000, None,
               _us(datetime(2024, 3, 1)) // 1000, _us(datetime(1970, 1, 1)) // 1000, _us(datetime(2024, 3, 9)) // 1000],
        "d": [_days(date(2024, 2, 29)), _days(date(2023, 12, 31)), _days(date(2024, 3, 4)), _days(date(2024, 2, 29)), None, _days(date(2024, 3, 10))],
        "dur": [90 * 60 * 1_000_000, -1_500_000, None, 3 * 86_400_000_000 + 1, 0, 25 * 3_600_000_000],
    },
)
holidays = table(
    [("d", "date"), ("name", "utf8")],
    {"d": [_days(date(2024, 2, 29)), _days(date(2024, 3, 10)), _days(date(2025, 1, 1))], "name": ["leap", "sunday", "new year"]},
)

nested = table(
    [("k", "utf8"), ("g", "i32"), ("xs", "list<i32>"), ("ws", "list<utf8>"), ("s", "struct<a:i32,b:utf8>")],
    {
        "k": ["a", "b", "c", "d", "e"],
        "g": [1, 2, 1, 2, 1],
        "xs": [[1, 2, 3], [], None, [4, None, 2], [7]],
        "ws": [["a", "b"], ["c"], [], None, ["z", "a"]],
        "s": [{"a": 1, "b": "x"}, {"a": None, "b": "y"}, None, {"a": 4, "b": None}, {"a": 5, "b": "z"}],
    },
)
nested_right = table(
    [("k", "utf8"), ("tags", "list<utf8>")],
    {"k": ["a", "d", "x"], "tags": [["t1"], ["t2", "t3"], []]},
)

money = table(
    [("k", "utf8"), ("price", "decimal[10,2]"), ("fee", "decimal[6,3]"), ("qty", "decimal[4,0]"), ("x", "f64")],
    {
        "k": ["a", "b", "a", "c", "b", "a"],
        "price": ["12.34", "0.10", "-5.00", None, "99999999.99", "10.01"],
        "fee": ["0.125", "1.000", None, "2.500", "-0.001", "10.010"],
        "qty": ["3", "10", "2", "1", None, "7"],
        "x": [1.005, -2.5, 123.456, None, 1e6, 0.0],
    },
)

sales = table(
    [("region", "utf8"), ("quarter", "utf8"), ("units", "i32"), ("price", "f64")],
    {
        "region": ["north", "north", "south", "south", "north", "east", "south", "north"],
        "quarter": ["q1", "q2", "q1", "q3", "q1", "q2", "q1", None],
        "units": [10, 20, 5, None, 7, 3, 8, 1],
        "price": [1.5, 2.0, 1.0, 3.0, None, 2.5, 1.0, 9.0],
    },
)


def extended_cases():
    S = {"left": series}
    P = {"left": sales}
    out = []
    add = lambda *a: out.append(case(*a))
    over = lambda e, *keys: {"over": e, "partitionBy": [col(k) for k in keys]}

    # window functions over the whole frame
    add("window/cum", "cumulative sum, min, max and count; nulls stay null", S,
        [{"op": "select", "exprs": {"sx": fn("cumSum", col("x")), "si": fn("cumSum", col("i")), "mn": fn("cumMin", col("i")),
                                     "mx": fn("cumMax", col("x")), "n": fn("cumCount", col("x")), "sb": fn("cumSum", col("b"))}}])
    add("window/shift-diff", "shift (lag and lead) and diff", S,
        [{"op": "select", "exprs": {"lag": fn("shift", col("i")), "lead": fn("shift", col("x"), n=-2), "d": fn("diff", col("i")),
                                     "d2": fn("diff", col("x"), n=2), "ls": fn("shift", col("g"))}}])
    add("window/rank", "rank methods, nulls and NaN", S,
        [{"op": "select", "exprs": {"avg": fn("rank", col("x")), "min": fn("rank", col("i"), method="min"),
                                     "max": fn("rank", col("i"), method="max"), "dense": fn("rank", col("i"), method="dense", descending=True),
                                     "ord": fn("rank", col("x"), method="ordinal"), "s": fn("rank", col("g"), method="dense")}}])
    add("window/rolling", "rolling sum, mean, min and max", S,
        [{"op": "select", "exprs": {"s": fn("rollingSum", col("x"), window=3), "m": fn("rollingMean", col("i"), window=2),
                                     "mn": fn("rollingMin", col("x"), window=3, minPeriods=1), "mx": fn("rollingMax", col("i"), window=4, minPeriods=2)}}])
    # window functions per partition
    add("window/over-agg", "aggregates broadcast over partitions", S,
        [{"op": "withColumns", "exprs": {"total": over(agg("sum", col("x")), "g"), "n": over(agg("len"), "g"),
                                          "mean": over(agg("mean", col("i")), "g"), "first": over(agg("first", col("t")), "g", "b")}}])
    add("window/over-cum", "cumulative and shifted values per partition, in row order", S,
        [{"op": "withColumns", "exprs": {"cs": over(fn("cumSum", col("i")), "g"), "prev": over(fn("shift", col("x")), "g"),
                                          "d": over(fn("diff", col("t")), "g"), "r": over(fn("rank", col("x"), method="min"), "g"),
                                          "roll": over(fn("rollingSum", col("i"), window=2, minPeriods=1), "g")}}])
    add("window/over-filter", "filters after windows see the windowed values", S,
        [{"op": "withColumns", "exprs": {"cs": over(fn("cumSum", col("t")), "g")}},
         {"op": "filter", "predicate": fn("gt", col("t"), lit(2))}])
    add("window/filter-first", "windows after a filter only see the remaining rows", S,
        [{"op": "filter", "predicate": fn("isNotNull", col("x"))},
         {"op": "withColumns", "exprs": {"cs": fn("cumSum", col("x")), "r": over(fn("rank", col("x")), "g")}},
         {"op": "head", "n": 4}])

    # pivots
    add("pivot/sum", "pivot with a sum per cell; missing cells are null", P,
        [{"op": "pivot", "on": "quarter", "index": ["region"], "values": "units", "aggregate": "sum"}])
    add("pivot/first", "pivot with the first value per cell", P,
        [{"op": "pivot", "on": "region", "index": ["quarter"], "values": "price", "aggregate": "first"}])
    add("pivot/len", "pivot counting rows per cell", P,
        [{"op": "pivot", "on": "quarter", "index": ["region"], "values": "units", "aggregate": "len"}])
    add("pivot/columns", "pivot with declared output columns", P,
        [{"op": "pivot", "on": "quarter", "index": ["region"], "values": "price", "aggregate": "max", "columns": ["q1", "q2", "q4"]}])
    add("pivot/numeric-on", "pivot on a numeric column names columns by value", S,
        [{"op": "filter", "predicate": fn("isNotNull", col("g"))},
         {"op": "pivot", "on": "t", "index": ["g"], "values": "i", "aggregate": "min"}])
    add("unpivot/basic", "unpivot stacks columns, column by column", P,
        [{"op": "unpivot", "index": ["region"], "on": ["units", "price"]}])
    add("unpivot/names", "unpivot with named variable and value columns", P,
        [{"op": "pick", "columns": ["region", "quarter"]},
         {"op": "unpivot", "index": [], "on": ["region", "quarter"], "variable": "field", "value": "text"}])
    T = {"left": times, "right": holidays}
    us = lambda dt: int((dt - EPOCH).total_seconds() * 1_000_000)
    add("temporal/extract", "calendar fields of timestamps and dates", T,
        [{"op": "select", "exprs": {"y": fn("year", col("ts")), "mo": fn("month", col("ts")), "d": fn("day", col("ts")),
                                     "h": fn("hour", col("ts")), "mi": fn("minute", col("ts")), "s": fn("second", col("ts")),
                                     "ms": fn("millisecond", col("ts")), "wd": fn("weekday", col("ts")), "od": fn("ordinalDay", col("ts")),
                                     "dy": fn("year", col("d")), "dwd": fn("weekday", col("d")), "dod": fn("ordinalDay", col("d"))}}])
    add("temporal/arith", "timestamp differences are durations; durations shift timestamps", T,
        [{"op": "select", "exprs": {"gap": fn("sub", col("ts"), col("ms")), "later": fn("add", col("ts"), col("dur")),
                                     "earlier": fn("sub", col("ts"), col("dur")), "days": fn("sub", col("d"), lit(18000, "date")),
                                     "twice": fn("add", col("dur"), col("dur"))}}])
    add("temporal/truncate", "truncate to a calendar unit", T,
        [{"op": "select", "exprs": {"h": fn("truncate", col("ts"), every="1h"), "d": fn("truncate", col("ts"), every="1d"),
                                     "w": fn("truncate", col("ts"), every="1w"), "mo": fn("truncate", col("ts"), every="1mo"),
                                     "y": fn("truncate", col("ts"), every="1y"), "dmo": fn("truncate", col("d"), every="1mo")}}])
    add("temporal/duration", "durations in whole units", T,
        [{"op": "select", "exprs": {"d": fn("totalDays", col("dur")), "h": fn("totalHours", col("dur")), "m": fn("totalMinutes", col("dur")),
                                     "s": fn("totalSeconds", col("dur")), "ms": fn("totalMilliseconds", col("dur"))}}])
    add("temporal/cast", "casts between dates, timestamps and integers", T,
        [{"op": "select", "exprs": {"date": fn("cast", col("ts"), to="date"), "ts": fn("cast", col("d"), to="datetime[us]"),
                                     "us": fn("cast", col("ts"), to="i64"), "days": fn("cast", col("d"), to="i32"),
                                     "ms": fn("cast", col("ts"), to="datetime[ms]")}}])
    add("temporal/compare", "comparisons with timestamp literals and between units", T,
        [{"op": "filter", "predicate": fn("and", fn("gte", col("ts"), lit(us(datetime(2024, 3, 1)), "datetime[us]")), fn("lt", col("ms"), col("ts")))}])
    add("temporal/group-sort", "group by date, aggregate timestamps, sort", T,
        [{"op": "groupBy", "keys": ["d"], "aggs": {"first": agg("min", col("ts")), "last": agg("max", col("ts")), "n": agg("len"),
                                                     "total": agg("sum", col("dur"))}},
         {"op": "sort", "keys": [{"expr": col("last"), "descending": True}]}])
    add("temporal/join", "join on a date", T, [{"op": "join", "right": "right", "on": ["d"], "how": "left"}])
    N = {"left": nested, "right": nested_right}
    add("nested/list-ops", "list length, element access and aggregates", N,
        [{"op": "select", "exprs": {"n": fn("listLength", col("xs")), "first": fn("listGet", col("xs"), index=0),
                                     "last": fn("listGet", col("xs"), index=-1), "oob": fn("listGet", col("xs"), index=5),
                                     "sum": fn("listSum", col("xs")), "mean": fn("listMean", col("xs")), "min": fn("listMin", col("xs")),
                                     "max": fn("listMax", col("ws")), "has2": fn("listContains", col("xs"), lit(2)),
                                     "hasA": fn("listContains", col("ws"), lit("a"))}}])
    add("nested/struct", "struct fields and struct construction", N,
        [{"op": "select", "exprs": {"a": fn("field", col("s"), field="a"), "b": fn("field", col("s"), field="b"),
                                     "pair": fn("struct", col("k"), fn("listLength", col("xs")), names=["key", "size"])}}])
    add("nested/explode", "explode lists into rows; a null list gives a null row, an empty list no rows", N,
        [{"op": "pick", "columns": ["k", "xs"]}, {"op": "explode", "column": "xs"}])
    add("nested/unnest", "unnest a struct into columns", N, [{"op": "pick", "columns": ["k", "s"]}, {"op": "unnest", "column": "s"}])
    add("nested/agg-list", "collect values into lists per group", N,
        [{"op": "groupBy", "keys": ["g"], "aggs": {"ks": agg("list", col("k")), "firsts": agg("first", col("xs")),
                                                     "n": agg("len")}}])
    add("nested/carry", "lists and structs survive filters, sorts, joins and slices", N,
        [{"op": "filter", "predicate": fn("neq", col("k"), lit("c"))},
         {"op": "sort", "keys": [{"expr": col("g"), "descending": True}, {"expr": col("k")}]},
         {"op": "join", "right": "right", "on": ["k"], "how": "left"},
         {"op": "head", "n": 4}])
    D = {"left": money}
    add("decimal/arith", "decimal addition, subtraction and multiplication", D,
        [{"op": "select", "exprs": {"sum": fn("add", col("price"), col("fee")), "diff": fn("sub", col("price"), col("fee")),
                                     "prod": fn("mul", col("price"), col("qty")), "plus": fn("add", col("price"), lit("0.5", "decimal[3,1]"))}}])
    add("decimal/compare", "decimal comparisons, also across scales", D,
        [{"op": "filter", "predicate": fn("and", fn("gt", col("price"), lit("10.00", "decimal[10,2]")), fn("gte", col("price"), col("fee")))}])
    add("decimal/aggregate", "sums, extremes and means of decimals per group", D,
        [{"op": "groupBy", "keys": ["k"], "aggs": {"total": agg("sum", col("price")), "min": agg("min", col("price")),
                                                     "max": agg("max", col("fee")), "mean": agg("mean", col("price")), "n": agg("count", col("price"))}}])
    add("decimal/cast", "casts between decimals, floats, integers and strings", D,
        [{"op": "select", "exprs": {"f": fn("cast", col("price"), to="f64"), "i": fn("cast", col("price"), to="i32"),
                                     "s": fn("cast", col("fee"), to="utf8"), "d": fn("cast", col("x"), to="decimal[10,2]"),
                                     "r": fn("cast", col("price"), to="decimal[12,1]")}}])
    add("decimal/sort", "sort by a decimal", D, [{"op": "sort", "keys": [{"expr": col("price"), "descending": True}], "nullsLast": True}])
    return out


def main():
    gold = HERE / "gold"
    gold.mkdir(exist_ok=True)
    header = {"generator": "generate_gold.py", "polars": pl.__version__, "deviations": DEVIATIONS}
    spec = spec_cases()
    (gold / "spec.json").write_text(json.dumps({**header, "cases": spec}, ensure_ascii=False, indent=None, separators=(",", ":")) + "\n")
    rng = random.Random(20261114)
    cases = [c for c in (random_case(rng, i) for i in range(400)) if c is not None]
    (gold / "random.json").write_text(json.dumps({**header, "cases": cases}, ensure_ascii=False, indent=None, separators=(",", ":")) + "\n")
    extended = extended_cases()
    (gold / "extended.json").write_text(json.dumps({**header, "cases": extended}, ensure_ascii=False, indent=None, separators=(",", ":")) + "\n")
    print(f"spec: {len(spec)} cases, random: {len(cases)} cases, extended: {len(extended)} cases")


if __name__ == "__main__":
    main()
