/**
 * Compiling plans to SQL.
 *
 * Every relation the compiler builds carries a hidden row column: a key
 * that increases in row order. Operations keep it (filters, projections),
 * redefine it (sorts, joins, concatenations: `ROW_NUMBER()` over the new
 * order) or derive it (groups: the first row's key), and the final query
 * orders by it. This reproduces the row order of the in-memory engine:
 * stable sorts, groups in order of first appearance, joins in left row
 * order, `first`/`last` by row order, windows over rows in order.
 *
 * Column types come from the in-memory engine: every relation carries the
 * frame the engine gives for its plan on zero-row inputs, so the compiler
 * knows the engine's type of every column and expression. The final query
 * renders every column as text (temporal values as integers in their unit),
 * and `decode` reads the rows back as columns of those types.
 *
 * Helper columns (the row key and the like) share one prefix, chosen per
 * plan so that no column of the plan starts with it.
 *
 * @internal
 */
import * as ArrowColumn from "../../arrow/ArrowColumn.ts"
import * as S from "../../arrow/ArrowSchema.ts"
import * as BigDecimal from "../../BigDecimal.ts"
import * as Result from "../../Result.ts"
import type * as Plan from "../Plan.ts"
import * as D from "./dtype.ts"
import * as E from "./expr.ts"
import * as F from "./frame.ts"
import * as K from "./kernels.ts"
import * as Q from "./query.ts"
import * as Schema_ from "./schema.ts"
import { civil, coarser } from "./temporal.ts"
import * as V from "./vector.ts"

interface Compiler {
  /** The engine's frame for every node of the plan, on zero-row inputs. */
  readonly frames: ReadonlyMap<Plan.Node, F.Frame>
  /** A quoted helper column name, disjoint from the plan's column names. */
  readonly hidden: (name: string) => string
  /** The quoted row key. */
  readonly row: string
  /** The quoted name of the source of each table name (see {@link source}). */
  readonly sources: ReadonlyMap<string, string>
}

/** @internal */
export const quote = (name: string): string => `"${name.replaceAll(`"`, `""`)}"`

const list = (names: ReadonlyArray<string>, prefix = "") => names.map((n) => `${prefix}${quote(n)}`).join(", ")

const unsupported = (what: string): never => V.fail(`${what} is not supported by the SQL engine`)

// -----------------------------------------------------------------------------
// Types and literals
// -----------------------------------------------------------------------------

const sqlType = (t: S.DataType): string => {
  switch (t._tag) {
    case "Int":
      return t.bitWidth <= 16 && t.signed ? "SMALLINT" : t.bitWidth <= 16 || (t.bitWidth === 32 && t.signed)
        ? "INTEGER"
        : t.bitWidth === 32
        ? "BIGINT"
        : t.signed
        ? "BIGINT"
        : "NUMERIC(20, 0)"
    case "Float":
      return t.bitWidth === 32 ? "REAL" : "DOUBLE PRECISION"
    case "Utf8":
    case "LargeUtf8":
    case "Utf8View":
      return "TEXT"
    case "Binary":
    case "LargeBinary":
    case "BinaryView":
      return "BYTEA"
    case "Bool":
      return "BOOLEAN"
    case "Date":
      return "DATE"
    case "Timestamp":
      return t.timezone === undefined ? "TIMESTAMP" : "TIMESTAMPTZ"
    case "Duration":
      return "INTERVAL"
    case "Decimal":
      return `DECIMAL(${t.precision}, ${t.scale})`
    case "Null":
      return "INTEGER"
    default:
      return unsupported(`columns of type ${t._tag}`)
  }
}

const string = (s: string): string => `'${s.replaceAll("'", "''")}'`

const pad = (n: number, width = 2) => String(n).padStart(width, "0")

const perSecond: Record<Plan.TimeUnit, bigint> = {
  second: BigInt(1),
  millisecond: BigInt(1000),
  microsecond: BigInt(1_000_000),
  nanosecond: BigInt(1_000_000_000)
}

const floorDiv = (a: bigint, b: bigint) => (a < BigInt(0) ? -((-a + b - BigInt(1)) / b) : a / b)

const timestampText = (value: bigint, unit: Plan.TimeUnit): string => {
  const per = perSecond[unit]
  const perDay = per * BigInt(86400)
  const days = floorDiv(value, perDay)
  const rem = value - days * perDay
  const [y, m, d] = civil(Number(days))
  const seconds = Number(rem / per)
  const micros = Number((rem % per) * BigInt(1_000_000) / per)
  return `${pad(y, 4)}-${pad(m)}-${pad(d)} ${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${
    pad(seconds % 60)
  }.${pad(micros, 6)}`
}

const NAN = "CAST('NaN' AS DOUBLE PRECISION)"

const literal = (value: unknown, type: Plan.LiteralType | undefined): string => {
  if (value === null || value === undefined) return "NULL"
  if (type !== undefined) {
    const big = BigInt(value as number | bigint)
    switch (type._tag) {
      case "Date": {
        const [y, m, d] = civil(Number(big))
        return `DATE '${pad(y, 4)}-${pad(m)}-${pad(d)}'`
      }
      case "Timestamp":
        return type.timezone === undefined
          ? `TIMESTAMP '${timestampText(big, type.unit)}'`
          : `TIMESTAMPTZ '${timestampText(big, type.unit)}+00'`
      case "Duration":
        return fromInteger(`CAST(${big} AS BIGINT)`, S.duration(type.unit))
      case "Decimal": {
        const negative = big < BigInt(0)
        const digits = (negative ? -big : big).toString().padStart(type.scale + 1, "0")
        const text = type.scale === 0 ? digits : `${digits.slice(0, -type.scale)}.${digits.slice(-type.scale)}`
        return `CAST('${negative ? "-" : ""}${text}' AS DECIMAL(${type.precision}, ${type.scale}))`
      }
    }
  }
  switch (typeof value) {
    case "number":
      if (Number.isNaN(value)) return NAN
      if (!Number.isFinite(value)) return `CAST('${value > 0 ? "" : "-"}Infinity' AS DOUBLE PRECISION)`
      if (Object.is(value, -0)) return `CAST('-0' AS DOUBLE PRECISION)`
      return Number.isInteger(value) ? String(value) : `CAST(${value} AS DOUBLE PRECISION)`
    case "bigint":
      return `CAST(${value} AS BIGINT)`
    case "boolean":
      return value ? "TRUE" : "FALSE"
    case "string":
      return string(value)
    default:
      return unsupported(`literals like ${String(value)}`)
  }
}

// -----------------------------------------------------------------------------
// Temporal values and casts
// -----------------------------------------------------------------------------

type Temporal = S.Date | S.Timestamp | S.Duration

const isTemporal = (t: S.DataType): t is Temporal =>
  t._tag === "Date" || t._tag === "Timestamp" || t._tag === "Duration"

/** The integer type of a temporal type's values. */
const integerOf = (t: Temporal): S.Int => (t._tag === "Date" && t.unit === "day" ? S.int32 : S.int64)

/**
 * A temporal value as its integer: its `unit`s (its own by default) since
 * the epoch, rounded down, or its length in them, rounded toward zero.
 */
const toInteger = (x: string, type: Temporal, unit?: Plan.TimeUnit): string => {
  if (type._tag !== "Date") {
    const rounding = type._tag === "Duration" ? "TRUNC" : "FLOOR"
    return `CAST(${rounding}(EXTRACT(EPOCH FROM ${x}) * ${perSecond[unit ?? type.unit]}) AS BIGINT)`
  }
  const days = `(CAST(${x} AS DATE) - DATE '1970-01-01')`
  return type.unit === "day" ? days : `(CAST(${days} AS BIGINT) * 86400000)`
}

/**
 * An interval of `micros` (a BIGINT) microseconds. Intervals multiply in
 * double precision, so whole hours and the remaining microseconds are
 * multiplied separately, each exactly.
 */
const interval = (micros: string): string =>
  `((${micros}) / 3600000000 * INTERVAL '1 hour' + (${micros}) % 3600000000 * INTERVAL '1 microsecond')`

/** The temporal value of `type` whose integer (see {@link toInteger}) is `x`, of type {@link integerOf}. */
const fromInteger = (x: string, type: Temporal): string => {
  if (type._tag === "Date") {
    return `(DATE '1970-01-01' + CAST(${type.unit === "day" ? x : `FLOOR(${x} / 86400000.0)`} AS INTEGER))`
  }
  const micros = type.unit === "nanosecond"
    ? `CAST(${type._tag === "Duration" ? "TRUNC" : "FLOOR"}(${x} / 1000.0) AS BIGINT)`
    : `(${x} * ${perSecond.microsecond / perSecond[type.unit]})`
  if (type._tag === "Duration") return interval(micros)
  const epoch = type.timezone === undefined ? "TIMESTAMP '1970-01-01 00:00:00'" : "TIMESTAMPTZ '1970-01-01 00:00:00+00'"
  return `(${epoch} + ${interval(micros)})`
}

/**
 * `x` converted from `from` to `to` as the engine converts: timestamps
 * and durations rescale to the target unit (rounding as {@link toInteger}),
 * timestamps and dates convert at midnight, and other temporal values
 * convert as their integers.
 */
const cast = (x: string, from: S.DataType, to: S.DataType): string => {
  if (isTemporal(from) && isTemporal(to)) {
    if (from._tag !== "Date" && from._tag === to._tag) return fromInteger(toInteger(x, from, to.unit), to)
    if (from._tag === "Timestamp" && to._tag === "Date") {
      return fromInteger(`CAST(FLOOR(EXTRACT(EPOCH FROM ${x}) / 86400) AS BIGINT)`, S.date("day"))
    }
    if (from._tag === "Date" && to._tag === "Timestamp") {
      return fromInteger(`CAST(${toInteger(x, S.date("day"))} AS BIGINT) * ${BigInt(86400) * perSecond[to.unit]}`, to)
    }
    return fromInteger(cast(toInteger(x, from), integerOf(from), integerOf(to)), to)
  }
  if (isTemporal(from)) return cast(toInteger(x, from), integerOf(from), to)
  if (isTemporal(to)) return fromInteger(cast(x, from, integerOf(to)), to)
  // Floats and decimals truncate towards zero.
  const truncated = to._tag === "Int" && (from._tag === "Decimal" || from._tag === "Float") ? `TRUNC(${x})` : x
  return `CAST(${truncated} AS ${sqlType(to)})`
}

/**
 * Operands as the engine combines them: timestamps and durations of mixed
 * units converted to the coarsest of their units first.
 */
const sameUnit = (xs: ReadonlyArray<string>, types: ReadonlyArray<S.DataType>): Array<string> => {
  const units = types.flatMap((t) => (t._tag === "Timestamp" || t._tag === "Duration" ? [t.unit] : []))
  if (units.every((u) => u === units[0])) return [...xs]
  const unit = units.reduce(coarser)
  return xs.map((x, i) => {
    const t = types[i]
    if (t._tag === "Timestamp" && t.unit !== unit) return cast(x, t, S.timestamp(unit, t.timezone))
    if (t._tag === "Duration" && t.unit !== unit) return cast(x, t, S.duration(unit))
    return x
  })
}

// -----------------------------------------------------------------------------
// Expressions
// -----------------------------------------------------------------------------

interface Scope {
  readonly compiler: Compiler
  /** The input relation's frame (zero rows). */
  readonly frame: F.Frame
  /** The PARTITION BY expressions of an enclosing `over`. */
  readonly partition: ReadonlyArray<string> | undefined
}

/** The engine's type of an expression's result. */
const typeOf = (node: Plan.Expression, scope: Scope): S.DataType =>
  E.evaluate(
    scope.partition === undefined ? node : { _tag: "Over", expression: node, partitionBy: [] },
    F.context(scope.frame)
  ).vector.type

const partitionBy = (scope: Scope, separator = ""): string =>
  scope.partition === undefined || scope.partition.length === 0
    ? ""
    : `PARTITION BY ${scope.partition.join(", ")}${separator}`

const isNaNSql = (x: string) => `(${x} = ${NAN})`

const window = (scope: Scope, frame?: string): string =>
  `OVER (${partitionBy(scope, " ")}ORDER BY ${scope.compiler.row}${frame === undefined ? "" : ` ${frame}`})`

const running = "ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW"

const float = (x: string) => `CAST(${x} AS DOUBLE PRECISION)`

/** A power of ten as an exact SQL literal. */
const power = (k: number) => k >= 0 ? `1${"0".repeat(k)}` : `0.${"0".repeat(-k - 1)}1`

/**
 * `round` as the engine does it: floats as `rint(x * 10^d) / 10^d` in double
 * precision, decimals half to even at `d` places into the engine's result
 * type, integers unchanged.
 */
const round = (x: string, type: S.DataType, result: S.DataType, decimals: number): string => {
  switch (type._tag) {
    case "Int":
    case "Null":
      return x
    case "Decimal": {
      if (decimals >= type.scale) return x
      const scaled = decimals === 0 ? x : `(${x} * ${power(decimals)})`
      const floor = `FLOOR(${scaled})`
      const up = `(${scaled} - ${floor} > 0.5 OR (${scaled} - ${floor} = 0.5 AND MOD(${floor}, 2) <> 0))`
      const rounded = `(CASE WHEN ${up} THEN ${floor} + 1 ELSE ${floor} END)`
      return `CAST(${decimals === 0 ? rounded : `(${rounded} / ${power(decimals)})`} AS ${sqlType(result)})`
    }
    default: {
      if (decimals === 0) return `ROUND(${float(x)})`
      const scale = float(literal(10 ** decimals, undefined))
      return `(ROUND(${float(x)} * ${scale}) / ${scale})`
    }
  }
}

/** The SQL aggregate for the minimum or maximum of a column of `type` (booleans have their own). */
const extreme = (fn: "min" | "max", type: S.DataType["_tag"] | undefined): string =>
  type === "Bool" ? (fn === "min" ? "BOOL_AND" : "BOOL_OR") : fn.toUpperCase()

/**
 * The aggregate `node` of `x`, the SQL of its argument (of type `type`); a
 * window function when `over` (its window) is given.
 */
const aggregate = (
  node: Plan.AggregateCall,
  x: string,
  type: S.DataType["_tag"] | undefined,
  scope: Scope,
  over: string | undefined
): string => {
  const row = scope.compiler.row
  const o = over === undefined ? "" : ` ${over}`
  switch (node.fn) {
    case "count":
      return node.arg === undefined ? `COUNT(*)${o}` : `COUNT(${x})${o}`
    case "sum":
      if (type === "Duration") return `COALESCE(SUM(${x})${o}, INTERVAL '0 seconds')`
      return `COALESCE(SUM(${type === "Bool" ? `CAST(${x} AS INTEGER)` : x})${o}, 0)`
    case "mean":
      return `AVG(${x})${o}`
    case "min":
    case "max": {
      const fn = extreme(node.fn, type)
      // Floats: NaN is skipped unless every value is NaN.
      return type === "Float"
        ? `COALESCE(${fn}(CASE WHEN ${isNaNSql(x)} THEN NULL ELSE ${x} END)${o}, ${fn}(${x})${o})`
        : `${fn}(${x})${o}`
    }
    case "std":
      return `STDDEV_SAMP(${x})${o}`
    case "variance":
      return `VAR_SAMP(${x})${o}`
    case "median":
      if (over !== undefined) return unsupported("median over partitions")
      return `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${x})`
    case "countDistinct":
      if (over !== undefined) return unsupported("countDistinct over partitions")
      // Nulls count as one value.
      return `(COUNT(DISTINCT ${x}) + CASE WHEN COUNT(*) > COUNT(${x}) THEN 1 ELSE 0 END)`
    case "first":
    case "last": {
      if (over !== undefined) {
        return `${node.fn === "first" ? "FIRST_VALUE" : "LAST_VALUE"}(${x}) OVER (${
          partitionBy(scope, " ")
        }ORDER BY ${row} ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`
      }
      return `(ARRAY_AGG(${x} ORDER BY ${row} ${node.fn === "first" ? "ASC" : "DESC"}))[1]`
    }
    case "list":
      if (over !== undefined) return unsupported("list over partitions")
      return `ARRAY_AGG(${x} ORDER BY ${row})`
  }
}

const truncateUnits: Record<string, string> = { "1h": "hour", "1d": "day", "1w": "week", "1mo": "month", "1y": "year" }
const totalSeconds: Record<string, number> = {
  totalDays: 86400,
  totalHours: 3600,
  totalMinutes: 60,
  totalSeconds: 1,
  totalMilliseconds: 0.001
}

const call = (node: Plan.Call, scope: Scope): string => {
  const row = scope.compiler.row
  const types = node.args.map((x) => typeOf(x, scope))
  const raw = node.args.map((x) => expression(x, scope))
  // between compares its operand with each bound separately.
  const a = node.fn === "between" ? raw : sameUnit(raw, types)
  const k = types.map((t) => t._tag)
  const ints = k[0] === "Int" && k[1] === "Int"
  const o = node.options ?? {}
  // Floored modulo of integers, exact, null for a zero divisor.
  const intMod = () => `((${a[0]} % NULLIF(${a[1]}, 0)) + ${a[1]}) % NULLIF(${a[1]}, 0)`
  switch (node.fn) {
    case "add":
      return `(${a[0]} + ${a[1]})`
    case "subtract":
      if (k[0] === "Date" && k[1] === "Date") return `((${a[0]} - ${a[1]}) * INTERVAL '1 day')`
      return `(${a[0]} - ${a[1]})`
    case "multiply":
      return `(${a[0]} * ${a[1]})`
    case "divide":
      return `(${float(a[0])} / ${a[1]})`
    case "floorDivide":
      return ints
        ? `((${a[0]} - (${intMod()})) / NULLIF(${a[1]}, 0))`
        : `FLOOR(${float(a[0])} / ${a[1]})`
    case "mod":
      return ints ? `(${intMod()})` : `(${a[0]} - ${a[1]} * FLOOR(${float(a[0])} / ${a[1]}))`
    case "negate":
      return `(-(${a[0]}))`
    case "abs":
      return `ABS(${a[0]})`
    case "sqrt":
      return `(CASE WHEN ${float(a[0])} < 0 THEN ${NAN} ELSE SQRT(${float(a[0])}) END)`
    case "round":
      return round(a[0], typeOf(node.args[0], scope), typeOf(node, scope), o.decimals ?? 0)
    case "eq":
      return `(${a[0]} = ${a[1]})`
    case "neq":
      return `(${a[0]} <> ${a[1]})`
    case "lt":
      return `(${a[0]} < ${a[1]})`
    case "lte":
      return `(${a[0]} <= ${a[1]})`
    case "gt":
      return `(${a[0]} > ${a[1]})`
    case "gte":
      return `(${a[0]} >= ${a[1]})`
    case "between": {
      const [x, lo] = sameUnit([a[0], a[1]], [types[0], types[1]])
      const [y, hi] = sameUnit([a[0], a[2]], [types[0], types[2]])
      return `(${x} >= ${lo} AND ${y} <= ${hi})`
    }
    case "isIn": {
      const values = (o.values ?? []).filter((v) => v !== null)
      return values.length === 0 ?
        `(${a[0]} IS NULL AND NULL)` :
        `(${a[0]} IN (${values.map((v) => literal(v, undefined)).join(", ")}))`
    }
    case "and":
      return `(${a[0]} AND ${a[1]})`
    case "or":
      return `(${a[0]} OR ${a[1]})`
    case "not":
      return `(NOT ${a[0]})`
    case "isNull":
      return `(${a[0]} IS NULL)`
    case "isNotNull":
      return `(${a[0]} IS NOT NULL)`
    case "isNaN":
      return isNaNSql(a[0])
    case "fillNull":
    case "coalesce":
      return `COALESCE(${a.join(", ")})`
    case "when":
      return `(CASE WHEN ${a[0]} THEN ${a[1]} ELSE ${a[2]} END)`
    case "cast":
      return cast(a[0], typeOf(node.args[0], scope), typeOf(node, scope))
    case "length":
      return `LENGTH(${a[0]})`
    case "toLowerCase":
      return `LOWER(${a[0]})`
    case "toUpperCase":
      return `UPPER(${a[0]})`
    case "includes":
      return `(STRPOS(${a[0]}, ${string(o.pattern ?? "")}) > 0)`
    case "startsWith":
      return `(LEFT(${a[0]}, ${[...(o.pattern ?? "")].length}) = ${string(o.pattern ?? "")})`
    case "endsWith":
      return `(RIGHT(${a[0]}, ${[...(o.pattern ?? "")].length}) = ${string(o.pattern ?? "")})`
    case "concat":
      return `(${a.join(" || ")})`
    case "cumSum":
      return `(CASE WHEN ${a[0]} IS NULL THEN NULL ELSE SUM(${k[0] === "Bool" ? `CAST(${a[0]} AS INTEGER)` : a[0]}) ${
        window(scope, running)
      } END)`
    case "cumMin":
    case "cumMax": {
      const fn = extreme(node.fn === "cumMin" ? "min" : "max", k[0])
      // Floats: NaN is skipped (it stays only while no other value was seen).
      const value = k[0] === "Float"
        ? `COALESCE(${fn}(CASE WHEN ${isNaNSql(a[0])} THEN NULL ELSE ${a[0]} END) ${window(scope, running)}, ${a[0]})`
        : `${fn}(${a[0]}) ${window(scope, running)}`
      return `(CASE WHEN ${a[0]} IS NULL THEN NULL ELSE ${value} END)`
    }
    case "cumCount":
      return `COUNT(${a[0]}) ${window(scope, running)}`
    case "shift": {
      const n = o.n ?? 1
      return n >= 0 ? `LAG(${a[0]}, ${n}) ${window(scope)}` : `LEAD(${a[0]}, ${-n}) ${window(scope)}`
    }
    case "diff":
      return `(${a[0]} - LAG(${a[0]}, ${o.n ?? 1}) ${window(scope)})`
    case "rank": {
      const order = `${a[0]} ${o.descending ? "DESC" : "ASC"} NULLS LAST`
      const part = partitionBy(scope, " ")
      const ties = `COUNT(*) OVER (PARTITION BY ${[...(scope.partition ?? []), a[0]].join(", ")})`
      const ranked = (() => {
        switch (o.method ?? "average") {
          case "min":
            return `RANK() OVER (${part}ORDER BY ${order})`
          case "max":
            return `(RANK() OVER (${part}ORDER BY ${order}) + ${ties} - 1)`
          case "dense":
            return `DENSE_RANK() OVER (${part}ORDER BY ${order})`
          case "ordinal":
            return `ROW_NUMBER() OVER (${part}ORDER BY ${order}, ${row})`
          case "average":
            return `(RANK() OVER (${part}ORDER BY ${order}) + (${ties} - 1) / 2.0)`
        }
      })()
      return `(CASE WHEN ${a[0]} IS NULL THEN NULL ELSE ${ranked} END)`
    }
    case "rollingSum":
    case "rollingMean":
    case "rollingMin":
    case "rollingMax": {
      const frame = `ROWS BETWEEN ${(o.window ?? 1) - 1} PRECEDING AND CURRENT ROW`
      const fn = { rollingSum: "SUM", rollingMean: "AVG", rollingMin: "MIN", rollingMax: "MAX" }[node.fn]
      const enough = `COUNT(${a[0]}) ${window(scope, frame)} >= ${o.minPeriods ?? o.window ?? 1}`
      // Floats: a NaN in the window makes the minimum or maximum NaN.
      const value = k[0] === "Float" && (fn === "MIN" || fn === "MAX")
        ? `CASE WHEN MAX(CASE WHEN ${isNaNSql(a[0])} THEN 1 ELSE 0 END) ${
          window(scope, frame)
        } = 1 THEN ${NAN} ELSE ${fn}(${a[0]}) ${window(scope, frame)} END`
        : `${fn}(${a[0]}) ${window(scope, frame)}`
      return `(CASE WHEN ${enough} THEN ${value} END)`
    }
    case "year":
    case "month":
    case "day":
    case "hour":
    case "minute":
      return `CAST(EXTRACT(${node.fn.toUpperCase()} FROM ${a[0]}) AS INTEGER)`
    case "second":
      return `CAST(FLOOR(EXTRACT(SECOND FROM ${a[0]})) AS INTEGER)`
    case "millisecond":
      return `CAST(MOD(FLOOR(EXTRACT(MILLISECONDS FROM ${a[0]})), 1000) AS INTEGER)`
    case "weekday":
      return `CAST(EXTRACT(ISODOW FROM ${a[0]}) AS INTEGER)`
    case "ordinalDay":
      return `CAST(EXTRACT(DOY FROM ${a[0]}) AS INTEGER)`
    case "truncate": {
      const unit = truncateUnits[o.every ?? ""] ?? unsupported(`truncate to ${o.every}`)
      return k[0] === "Date" ? `CAST(DATE_TRUNC('${unit}', ${a[0]}) AS DATE)` : `DATE_TRUNC('${unit}', ${a[0]})`
    }
    case "totalDays":
    case "totalHours":
    case "totalMinutes":
    case "totalSeconds":
    case "totalMilliseconds":
      return `CAST(TRUNC(EXTRACT(EPOCH FROM ${a[0]}) / ${totalSeconds[node.fn]}) AS BIGINT)`
    case "listLength":
      return `COALESCE(CARDINALITY(${a[0]}), CASE WHEN ${a[0]} IS NULL THEN NULL ELSE 0 END)`
    case "listGet": {
      const i = o.index ?? 0
      return `${a[0]}[${i >= 0 ? `${i + 1}` : `CARDINALITY(${a[0]}) + ${i + 1}`}]`
    }
    case "listSum":
    case "listMean":
    case "listMin":
    case "listMax":
    case "struct":
      return unsupported(node.fn)
    case "listContains":
      return `(CASE WHEN ${a[0]} IS NULL THEN NULL ELSE ${a[1]} = ANY(${a[0]}) END)`
    case "field":
      return `(${a[0]}).${quote(o.name ?? "")}`
  }
}

const expression = (node: Plan.Expression, scope: Scope): string => {
  switch (node._tag) {
    case "Column":
      return quote(node.name)
    case "Literal":
      return literal(node.value, node.type)
    case "Call":
      return call(node, scope)
    case "AggregateCall": {
      if (scope.partition === undefined) return V.fail(`aggregate ${node.fn} can only be used in agg or over`)
      const inner = { ...scope, partition: undefined }
      const x = node.arg === undefined ? "" : expression(node.arg, inner)
      const type = node.arg === undefined ? undefined : typeOf(node.arg, inner)._tag
      return aggregate(node, x, type, scope, `OVER (${partitionBy(scope)})`)
    }
    case "Over": {
      // Within an enclosing partition (another `over`, or a group), partitions refine it.
      const keys = node.partitionBy.map((k) => expression(k, { ...scope, partition: undefined }))
      return expression(node.expression, { ...scope, partition: [...(scope.partition ?? []), ...keys] })
    }
  }
}

// -----------------------------------------------------------------------------
// Types of relations
// -----------------------------------------------------------------------------

const unsupportedNodes: ReadonlySet<Plan.Node["_tag"]> = new Set(["Pivot", "Unpivot", "Explode", "Unnest"])

/**
 * Runs the plan through the in-memory engine on zero-row inputs (tables as
 * their declared columns), recording every node's frame.
 */
const typed = (node: Plan.Node, frames: Map<Plan.Node, F.Frame>): F.Frame => {
  const known = frames.get(node)
  if (known !== undefined) return known
  let frame: F.Frame
  if (unsupportedNodes.has(node._tag)) return unsupported(node._tag)
  if (node._tag === "Table") {
    const columns = node.columns ?? V.fail(
      `the SQL engine needs the columns of table ${JSON.stringify(node.name)}: use Query.table with a schema`
    )
    frame = F.fromVectors(
      columns.map((c) => c.name),
      columns.map((c) => K.nullsOf(tableType(node.name, c), 0)),
      0
    )
  } else if (node._tag === "Values") {
    frame = F.slice(node.frame as unknown as F.Frame, 0, 0)
  } else {
    const inputs = Q.children(node as Q.Node).map((n) => typed(n as Plan.Node, frames))
    frame = Q.step(node as Q.Node, inputs)
  }
  frames.set(node, frame)
  return frame
}

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

const columnsOf = (node: Plan.Node, c: Compiler): ReadonlyArray<string> =>
  c.frames.get(node)!.columns.map((col) => col.name)

const typeIn = (node: Plan.Node, name: string, c: Compiler): S.DataType =>
  c.frames.get(node)!.columns.find((col) => col.name === name)!.type

/**
 * Column `name` of `input`, as `x`, in the type the column has in `node`:
 * joins and concatenations bring timestamps and durations of mixed units to
 * the coarser one.
 */
const conformed = (x: string, input: Plan.Node, node: Plan.Node, name: string, c: Compiler): string => {
  const from = typeIn(input, name, c)
  const to = typeIn(node, name, c)
  return isTemporal(from) && isTemporal(to) && !D.sameType(from, to) ? cast(x, from, to) : x
}

const scopeOf = (node: Plan.Node, compiler: Compiler): Scope => ({
  compiler,
  frame: compiler.frames.get(node)!,
  partition: undefined
})

const values = (frame: F.Frame, c: Compiler): string => {
  const columns = frame.columns.map((col) => {
    const type = col.type
    const vector = col.values()
    const raw = (vector as V.I32 | V.I64).values
    const values = type._tag === "Date" || type._tag === "Timestamp" || type._tag === "Duration" ||
        type._tag === "Decimal"
      ? undefined
      : F.toArray(frame, col.name)
    // Temporal and decimal values are written from their integers, at full precision.
    const value = (i: number): string => {
      switch (type._tag) {
        case "Date":
          return literal(type.unit === "day" ? raw[i] : floorDiv(raw[i] as bigint, BigInt(86_400_000)), {
            _tag: "Date"
          })
        case "Timestamp":
          return literal(raw[i], { _tag: "Timestamp", unit: type.unit, timezone: type.timezone })
        case "Duration":
          return literal(raw[i], { _tag: "Duration", unit: type.unit })
        case "Decimal":
          return literal(raw[i], { _tag: "Decimal", precision: type.precision, scale: type.scale })
        default: {
          const v = values![i]
          return typeof v === "bigint" ? String(v) : literal(v, undefined)
        }
      }
    }
    const sql = sqlType(type)
    return { name: quote(col.name), cell: (i: number) => `CAST(${V.isValid(vector, i) ? value(i) : "NULL"} AS ${sql})` }
  })
  if (frame.length === 0) {
    const nulls = frame.columns.map((col, i) => `CAST(NULL AS ${sqlType(col.type)}) AS ${columns[i].name}`)
    return `SELECT ${[...nulls, `CAST(0 AS BIGINT) AS ${c.row}`].join(", ")} WHERE FALSE`
  }
  const tuples = Array.from(
    { length: frame.length },
    (_, r) => `(${[...columns.map((col) => col.cell(r)), String(r + 1)].join(", ")})`
  )
  return `SELECT * FROM (VALUES ${tuples.join(", ")}) AS v(${[...columns.map((col) => col.name), c.row].join(", ")})`
}

const named = (items: ReadonlyArray<Plan.Named>, scope: Scope) =>
  items.map((c) => `${expression(c.expression, scope)} AS ${quote(c.name)}`)

/** A SELECT of the node's columns plus the row key. */
const relation = (node: Plan.Node, c: Compiler): string => {
  const row = c.row
  const columns = columnsOf(node, c)
  const keep = [...columns.map(quote), row].join(", ")
  const from = (alias = "t") => `(${relation((node as { readonly input: Plan.Node }).input, c)}) AS ${alias}`
  const scope = () => scopeOf((node as { readonly input: Plan.Node }).input, c)
  /** The rows of `input` renumbered in `order`. */
  const renumbered = (input: string, order: string) =>
    `SELECT ${
      [...columns.map(quote), `ROW_NUMBER() OVER (ORDER BY ${order}) AS ${row}`].join(", ")
    } FROM (${input}) AS t`
  switch (node._tag) {
    case "Table":
      return `SELECT ${
        [
          ...node.columns!.map((column) => `${declared(column)} AS ${quote(column.name)}`),
          `ROW_NUMBER() OVER () AS ${row}`
        ]
          .join(", ")
      } FROM ${c.sources.get(node.name)}`
    case "Values":
      return values(node.frame as unknown as F.Frame, c)
    case "Filter": {
      // The predicate is computed over the whole input first: it may hold window functions.
      const flag = c.hidden("keep")
      return `SELECT ${keep} FROM (SELECT *, ${
        expression(node.predicate, scope())
      } AS ${flag} FROM ${from()}) AS t WHERE ${flag}`
    }
    case "Select":
      return `SELECT ${[...named(node.columns, scope()), row].join(", ")} FROM ${from()}`
    case "WithColumns": {
      const s = scope()
      const added = new Map(node.columns.map((col) => [col.name, col.expression]))
      const inputs = columnsOf(node.input, c)
      const kept = inputs.map((name) => {
        const e = added.get(name)
        return e === undefined ? quote(name) : `${expression(e, s)} AS ${quote(name)}`
      })
      const extra = node.columns.filter((col) => !inputs.includes(col.name))
      return `SELECT ${[...kept, ...named(extra, s), row].join(", ")} FROM ${from()}`
    }
    case "Pick":
    case "Omit":
      return `SELECT ${keep} FROM ${from()}`
    case "Rename":
      return `SELECT ${
        [...columnsOf(node.input, c).map((name) => `${quote(name)} AS ${quote(node.mapping[name] ?? name)}`), row].join(
          ", "
        )
      } FROM ${from()}`
    case "Sort": {
      const s = scope()
      const keys = node.keys.map((k) =>
        `${expression(k.expression, s)} ${k.descending ? "DESC" : "ASC"} NULLS ${node.nullsLast ? "LAST" : "FIRST"}`
      )
      return renumbered(`SELECT * FROM ${from("s")}`, [...keys, row].join(", "))
    }
    case "Slice": {
      if (node.offset >= 0) {
        return `SELECT * FROM ${from()} ORDER BY ${row}${
          node.length === undefined ? "" : ` LIMIT ${node.length}`
        } OFFSET ${node.offset}`
      }
      const n = c.hidden("n")
      const i = c.hidden("i")
      const upper = node.length === undefined ? "" : ` AND ${i} <= ${n} + ${node.offset} + ${node.length}`
      return `SELECT ${keep} FROM (SELECT *, COUNT(*) OVER () AS ${n}, ROW_NUMBER() OVER (ORDER BY ${row}) AS ${i} FROM ${
        from("s")
      }) AS t WHERE ${i} > ${n} + ${node.offset}${upper}`
    }
    case "Unique": {
      const k = c.hidden("k")
      const keys = node.columns ?? columns
      const partition = keys.length === 0 ? "" : `PARTITION BY ${list(keys)} `
      return `SELECT ${keep} FROM (SELECT *, ROW_NUMBER() OVER (${partition}ORDER BY ${row}) AS ${k} FROM ${
        from("s")
      }) AS t WHERE ${k} = 1`
    }
    case "DropNulls": {
      const keys = node.columns ?? columns
      return `SELECT * FROM ${from()}${
        keys.length === 0 ? "" : ` WHERE ${keys.map((k) => `${quote(k)} IS NOT NULL`).join(" AND ")}`
      }`
    }
    case "GroupBy":
    case "Aggregate": {
      const keys = node._tag === "GroupBy" ? node.keys : []
      // Arguments are computed first, partitioned by the group: windows in them see only its rows.
      const group: Scope = { ...scope(), partition: keys.map(quote) }
      const args = node.aggregates.map((a, i) => {
        const arg = (a.expression as Plan.AggregateCall).arg
        return arg === undefined
          ? undefined
          : { name: c.hidden(`arg${i}`), sql: expression(arg, group), type: typeOf(arg, group)._tag }
      })
      const computed = args.flatMap((x) => x === undefined ? [] : [`, ${x.sql} AS ${x.name}`])
      const aggs = node.aggregates.map((a, i) =>
        `${aggregate(a.expression as Plan.AggregateCall, args[i]?.name ?? "", args[i]?.type, group, undefined)} AS ${
          quote(a.name)
        }`
      )
      const key = keys.length === 0 ? `1 AS ${row}` : `MIN(${row}) AS ${row}`
      return `SELECT ${[...keys.map(quote), ...aggs, key].join(", ")} FROM (SELECT *${
        computed.join("")
      } FROM ${from()}) AS t${keys.length === 0 ? "" : ` GROUP BY ${list(keys)}`}`
    }
    case "Join": {
      const l = relation(node.left, c)
      const r = relation(node.right, c)
      const on = node.on.map((k) => {
        const [x, y] = sameUnit([`l.${quote(k)}`, `r.${quote(k)}`], [typeIn(node.left, k, c), typeIn(node.right, k, c)])
        return `${x} = ${y}`
      }).join(" AND ")
      if (node.how === "semi" || node.how === "anti") {
        return `SELECT * FROM (${l}) AS l WHERE ${
          node.how === "anti" ? "NOT " : ""
        }EXISTS (SELECT 1 FROM (${r}) AS r WHERE ${on})`
      }
      const rightOnly = columnsOf(node.right, c).filter((name) => !node.on.includes(name))
      const fromLeft = (name: string) => conformed(`l.${quote(name)}`, node.left, node, name, c)
      const fromRight = (name: string) => conformed(`r.${quote(name)}`, node.right, node, name, c)
      const left = columnsOf(node.left, c).map((name) =>
        `${
          node.how === "full" && node.on.includes(name)
            ? `COALESCE(${fromLeft(name)}, ${fromRight(name)})`
            : fromLeft(name)
        } AS ${quote(name)}`
      )
      const join = node.how === "inner" ? "INNER JOIN" : node.how === "left" ? "LEFT JOIN" : "FULL JOIN"
      return `SELECT ${
        [...left, ...rightOnly.map((name) => `${fromRight(name)} AS ${quote(name)}`)].join(", ")
      }, ROW_NUMBER() OVER (ORDER BY l.${row}${
        node.how === "full" ? " NULLS LAST" : ""
      }, r.${row}) AS ${row} FROM (${l}) AS l ${join} (${r}) AS r ON ${on}`
    }
    case "Concat": {
      const source = c.hidden("source")
      const union = node.inputs
        .map((n, i) =>
          `SELECT ${
            columns.map((name) => `${conformed(quote(name), n, node, name, c)} AS ${quote(name)}`).join(", ")
          }, ${row}, ${i} AS ${source} FROM (${relation(n, c)}) AS t${i}`
        )
        .join(" UNION ALL ")
      return renumbered(union, `${source}, ${row}`)
    }
    case "Pivot":
    case "Unpivot":
    case "Explode":
    case "Unnest":
      return unsupported(node._tag)
  }
}

// -----------------------------------------------------------------------------
// Results
// -----------------------------------------------------------------------------

const scalars: ReadonlySet<S.DataType["_tag"]> = new Set(["Null", "Bool", "Int", "Float", "Decimal", "Utf8"])

/** SQL that renders a result column of `type` in the form `reader` reads. */
const output = (x: string, type: S.DataType): string => {
  const text = (y: string) => `CAST(${y} AS TEXT)`
  switch (type._tag) {
    case "Null":
      return "NULL"
    case "Bool":
    case "Int":
    case "Float":
    case "Decimal":
    case "Utf8":
      return text(`CAST(${x} AS ${sqlType(type)})`)
    case "Date":
    case "Timestamp":
    case "Duration":
      return text(toInteger(x, type))
    case "Binary":
      return x
    case "List":
      if (scalars.has(type.child.type._tag)) return `CAST(${x} AS TEXT[])`
  }
  return unsupported(`results of type ${D.describe(type)}`)
}

const number = (s: string): number => {
  const n = Number(s)
  if (!Number.isNaN(n)) return n
  const lower = s.toLowerCase()
  return lower.endsWith("inf") ? (lower.startsWith("-") ? -Infinity : Infinity) : NaN
}

/** Reads one non-null value of a result column of `type`. */
const reader = (type: S.DataType): (value: unknown) => unknown => {
  switch (type._tag) {
    case "Int":
      return type.bitWidth === 64 ? (v) => BigInt(String(v)) : (v) => Number(v)
    case "Float":
      return (v) => number(String(v))
    case "Bool":
      return (v) => v === true || v === "true" || v === "t"
    case "Decimal":
      return (v) => BigDecimal.fromStringUnsafe(String(v))
    case "Date":
    case "Timestamp":
    case "Duration":
      return (v) => BigInt(String(v))
    case "List": {
      const item = reader(type.child.type)
      return (v) => (v as ReadonlyArray<unknown>).map((x) => (x === null || x === undefined ? null : item(x)))
    }
    default:
      return (v) => v
  }
}

// -----------------------------------------------------------------------------
// Tables
// -----------------------------------------------------------------------------

const smallIntegers = ["smallint", "integer"]

/** A condition, as SQL on a value `x`, and the failure of a column with values that don't satisfy it. */
interface Condition {
  readonly holds: string
  readonly failure: string
}

const exactly = (type: S.DataType): string => `has values that ${D.describe(type)} can't hold exactly`

/** Integers in the range of an integer type. */
const inRange = (x: string, type: S.DataType): Array<Condition> => {
  const { bitWidth, signed } = type as S.Int
  const lo = signed ? -(BigInt(1) << BigInt(bitWidth - 1)) : BigInt(0)
  const hi = (BigInt(1) << BigInt(signed ? bitWidth - 1 : bitWidth)) - BigInt(1)
  return [{ holds: `${x} BETWEEN ${lo} AND ${hi}`, failure: exactly(type) }]
}

/**
 * Numbers that are 32-bit floats: zero, infinities, NaN, or numbers between
 * the least and the greatest 32-bit float in magnitude that convert to
 * `REAL` and back unchanged (outside that range the conversion fails).
 */
const float32 = (x: string, type: S.DataType): Array<Condition> => {
  const d = float(x)
  return [{
    holds: `(CASE WHEN ABS(${d}) BETWEEN ${float(`'${2 ** -149}'`)} AND ${
      float(`'${(2 - 2 ** -23) * 2 ** 127}'`)
    } THEN CAST(CAST(${d} AS REAL) AS DOUBLE PRECISION) = ${d} ELSE ${d} = 0 OR ABS(${d}) = ${
      float("'Infinity'")
    } OR ${d} = ${NAN} END)`,
    failure: exactly(type)
  }]
}

const int64 = BigInt(1) << BigInt(63)

/** Timestamps and durations in whole units of the type that fit 64 bits (PostgreSQL keeps microseconds). */
const wholeUnits = (x: string, type: S.DataType): Condition => {
  const v = `(EXTRACT(EPOCH FROM ${x}) * ${perSecond[(type as S.Timestamp | S.Duration).unit]})`
  return { holds: `${v} = TRUNC(${v}) AND ${v} BETWEEN ${-int64} AND ${int64 - BigInt(1)}`, failure: exactly(type) }
}

/**
 * How the SQL engine reads declared table columns of each type, as the
 * in-memory engine conforms table columns to their declaration:
 *
 * - `accepts` and `categories`: the PostgreSQL types, and type categories,
 *   of the columns it reads as such columns (integers below 64 bits for
 *   floats and narrower integers, as the in-memory engine; any type for
 *   `Null`, which holds only nulls).
 * - `conditions`: the conditions every value satisfies, beyond its type,
 *   for its declared type to hold it exactly.
 *
 * `undefined` for column types it doesn't read yet.
 */
const tableTypes: {
  readonly [K in Plan.TypeName]:
    | {
      readonly accepts?: ReadonlyArray<string>
      readonly categories?: ReadonlyArray<string>
      readonly conditions?: (x: string, type: S.DataType) => ReadonlyArray<Condition>
    }
    | undefined
} = {
  Int8: { accepts: smallIntegers, conditions: inRange },
  Int16: { accepts: smallIntegers, conditions: inRange },
  Int32: { accepts: smallIntegers },
  Int64: { accepts: ["bigint"] },
  UInt8: { accepts: smallIntegers, conditions: inRange },
  UInt16: { accepts: smallIntegers, conditions: inRange },
  UInt32: { accepts: smallIntegers, conditions: inRange },
  UInt64: { accepts: ["bigint"], conditions: inRange },
  Float16: undefined,
  Float32: { accepts: [...smallIntegers, "real", "double precision"], conditions: float32 },
  Float64: { accepts: [...smallIntegers, "real", "double precision"] },
  // String types and enums.
  Utf8: { categories: ["S", "E"] },
  Binary: { accepts: ["bytea"] },
  Bool: { accepts: ["boolean"] },
  Null: {},
  Date: { accepts: ["date"], conditions: (x, type) => [{ holds: `isfinite(${x})`, failure: exactly(type) }] },
  Time: undefined,
  Timestamp: {
    accepts: ["timestamp without time zone", "timestamp with time zone"],
    conditions: (x, type) => [
      {
        holds: `EXTRACT(EPOCH FROM ${x}) BETWEEN -8640000000000 AND 8640000000000.000999`,
        failure: "has timestamps outside the range of DateTime"
      },
      wholeUnits(x, type)
    ]
  },
  Duration: {
    accepts: ["interval"],
    conditions: (x, type) => [
      {
        holds: `EXTRACT(YEAR FROM ${x}) = 0 AND EXTRACT(MONTH FROM ${x}) = 0`,
        failure: "has durations in months, which have no fixed length"
      },
      wholeUnits(x, type)
    ]
  },
  Decimal: {
    accepts: ["numeric"],
    conditions: (x, type) => {
      const { precision, scale } = type as S.Decimal
      return [{
        holds: `ROUND(${x}, ${scale}) = ${x} AND ABS(${x}) < ${power(precision - scale)} AND ${x} * ${
          power(scale)
        } BETWEEN ${-int64} AND ${int64 - BigInt(1)}`,
        failure: exactly(type)
      }]
    }
  },
  List: undefined,
  Struct: undefined
}

/**
 * The type the SQL engine reads a declared table column as: the type the
 * in-memory engine conforms it to.
 */
const tableType = (table: string, column: Plan.TableColumn): S.DataType =>
  tableTypes[column.type] === undefined
    ? unsupported(
      `column ${JSON.stringify(column.name)} of table ${JSON.stringify(table)}: ${column.type} table columns`
    )
    : Schema_.arrowType(column)

/** The conditions of a declared column's values, `x` (see {@link tableTypes}). */
const conditions = (x: string, column: Plan.TableColumn): ReadonlyArray<Condition> =>
  tableTypes[column.type]!.conditions?.(x, Schema_.arrowType(column)) ?? []

/**
 * A check of a table: one SQL value, and a test of it that fails when the
 * table breaks its declaration.
 */
interface Check {
  readonly sql: string
  readonly verify: (value: unknown) => void
}

const utc = S.timestamp("microsecond")

/**
 * A declared column of a table's source as its declared type (timestamps
 * as UTC timestamps without a time zone, whatever the session's time
 * zone): null where it breaks a condition (see {@link conditions}), so that
 * reading such values doesn't fail before the checks of the rows do.
 */
const declared = (column: Plan.TableColumn): string => {
  const x = quote(column.name)
  const type = Schema_.arrowType(column)
  const value = type._tag === "Timestamp"
    ? fromInteger(toInteger(x, utc), utc)
    : type._tag === "Decimal"
    ? `CAST(${x} AS ${sqlType(type)})`
    : x
  const holds = conditions(x, column)
  return holds.length === 0 ? value : `(CASE WHEN ${holds.map((c) => c.holds).join(" AND ")} THEN ${value} END)`
}

/**
 * The checks of a table's declared column types that don't read its rows:
 * each value is the PostgreSQL type of a column the engine doesn't read as
 * declared, or null.
 */
const typeChecks = (table: Plan.Table): Array<Check> =>
  (table.columns ?? []).flatMap((column): Array<Check> => {
    if (column.type === "Null") return []
    const { accepts = [], categories = [] } = tableTypes[column.type]!
    const accepted = [
      ...(accepts.length === 0 ? [] : [`format_type(oid, NULL) IN (${accepts.map(string).join(", ")})`]),
      ...(categories.length === 0 ? [] : [`typcategory IN (${categories.map(string).join(", ")})`])
    ]
    return [{
      sql: `(SELECT CASE WHEN ${
        accepted.join(" OR ")
      } THEN NULL ELSE format_type(oid, NULL) END FROM pg_type WHERE oid = pg_typeof((SELECT ${
        quote(column.name)
      } FROM ${quote(table.name)} LIMIT 0)))`,
      verify: (actual) => {
        if (actual !== null) V.fail(`column ${JSON.stringify(column.name)} is ${actual}, expected ${column.type}`)
      }
    }]
  })

/**
 * The checks of a table's rows, the ones the in-memory engine makes beyond
 * column types: only nulls in `Null` columns, no nulls in other columns
 * unless they are nullable, the conditions of their values (see
 * {@link conditions}), and the values of the fields its schema constrains
 * beyond their column type (literals, enums, refinements) accepted by the
 * schema, tested on each such column's distinct values. Each value
 * aggregates the rows of the table's source.
 */
const rowChecks = (table: Plan.Table, frame: F.Frame): Array<Check> => [
  ...(table.columns ?? []).flatMap((column) => {
    const x = quote(column.name)
    const any = (failed: string, failure: string): Check => ({
      sql: `BOOL_OR(${failed})`,
      verify: (value) => {
        if (value === true) V.fail(`column ${JSON.stringify(column.name)} ${failure}`)
      }
    })
    return [
      ...(column.type === "Null"
        ? [any(`${x} IS NOT NULL`, "has values, expected Null")]
        : column.nullable
        ? []
        : [any(`${x} IS NULL`, "has missing values")]),
      ...conditions(x, column).map((c) => any(`NOT (${c.holds})`, c.failure))
    ]
  }),
  ...(table.schema === undefined ? [] : Schema_.columnChecks(table.schema)).map(([name, test]): Check => {
    const type = frame.columns.find((c) => c.name === name)!.type
    return {
      sql: `ARRAY_AGG(DISTINCT ${output(declared(table.columns!.find((c) => c.name === name)!), type)})`,
      verify: (values) => {
        const rows = ((values ?? []) as ReadonlyArray<unknown>).map((v) => [v])
        if (!F.toArray(decode(S.make([S.field(name, type, { nullable: true })]), rows), name).every(test)) {
          V.fail(`column ${JSON.stringify(name)} has values its schema rejects`)
        }
      }
    }
  })
]

/**
 * The source of the tables named `name` among `tables`: the columns they
 * declare, read once. It is `MATERIALIZED`, which PostgreSQL computes once
 * per statement, so the checks and the result read the same rows, whatever
 * the relation: views that sample rows or call functions included.
 */
const source = (name: string, tables: ReadonlyArray<Plan.Table>): string => {
  const columns = [...new Set(tables.flatMap((t) => t.name === name ? t.columns!.map((c) => c.name) : []))]
  return `MATERIALIZED (SELECT ${columns.length === 0 ? "1" : list(columns)} FROM ${quote(name)})`
}

/** One SQL query whose first row holds the values of checks. */
interface Checked {
  readonly sql: string
  readonly checks: ReadonlyArray<(value: unknown) => void>
}

/** @internal */
export interface Compiled {
  /** The query without the checks: the result's rows in the plan's row order. */
  readonly sql: string
  /**
   * The checks of the column types of the plan's tables, to run first (the
   * query doesn't compile against tables of other column types), when the
   * plan reads tables.
   */
  readonly types: Checked | undefined
  /**
   * The query: a row of the checks of its tables' rows first, when there
   * are some, then the result's rows in the plan's row order.
   */
  readonly query: Checked
  readonly schema: S.Schema
}

/**
 * A plan as SQL: the query, a query of its tables' column types, and the
 * query with the checks of their rows. @internal
 */
export const compile = (plan: Plan.Node): Compiled => {
  const frames = new Map<Plan.Node, F.Frame>()
  const result = typed(plan, frames)
  const used = new Set<string>()
  for (const frame of frames.values()) for (const col of frame.columns) used.add(col.name)
  let prefix = "__"
  while ([...used].some((name) => name.startsWith(prefix))) prefix += "_"
  const hidden = (name: string) => quote(prefix + name)
  const tables = [...frames].flatMap(([node, frame]) =>
    node._tag === "Table" ? [{ node, checks: rowChecks(node, frame) }] : []
  )
  const sources = new Map([...new Set(tables.map((t) => t.node.name))].map((name, i) => [name, hidden(`table${i}`)]))
  const compiler: Compiler = { frames, hidden, row: hidden("row"), sources }
  const sql = relation(plan, compiler)
  const schema = S.make(result.columns.map((col) => S.field(col.name, col.type, { nullable: true })))
  const columns = result.columns.map((col) => `${output(quote(col.name), col.type)} AS ${quote(col.name)}`)
  const ctes = [...sources].map(([name, cte]) => `${cte} AS ${source(name, tables.map((t) => t.node))}`)
  const prelude = ctes.length === 0 ? "" : `WITH ${ctes.join(", ")} `
  const body = `SELECT ${columns.length === 0 ? "1" : columns.join(", ")} FROM (${sql}) AS t ORDER BY ${compiler.row}`
  const columnTypes = tables.flatMap((t) => typeChecks(t.node))
  const types = columnTypes.length === 0 ? undefined : {
    sql: `SELECT ${columnTypes.map((check) => check.sql).join(", ")}`,
    checks: columnTypes.map((check) => check.verify)
  }
  const checked = tables.filter((t) => t.checks.length > 0)
  if (checked.length === 0) {
    return { sql: prelude + body, types, query: { sql: prelude + body, checks: [] }, schema }
  }
  const names: Array<string> = []
  const header = checked.map((t, i) =>
    `(SELECT ${
      t.checks.map((check) => {
        names.push(hidden(`check${names.length}`))
        return `${check.sql} AS ${names[names.length - 1]}`
      }).join(", ")
    } FROM ${sources.get(t.node.name)}) AS ${hidden(`checks${i}`)}`
  )
  const rows = `(SELECT ${[...columns, compiler.row].join(", ")} FROM (${sql}) AS t) AS r`
  return {
    sql: prelude + body,
    types,
    query: {
      sql: `${prelude}SELECT ${[...names, ...result.columns.map((col) => `r.${quote(col.name)}`)].join(", ")} FROM ${
        header.join(" CROSS JOIN ")
      } FULL JOIN ${rows} ON FALSE ORDER BY r.${compiler.row} NULLS FIRST`,
      checks: checked.flatMap((t) => t.checks.map((check) => check.verify))
    },
    schema
  }
}

/**
 * Tests the checks in the first row of a checked query's result, failing
 * when a table breaks its declaration, and returns the other rows without
 * the checks.
 *
 * @internal
 */
export const verify = (
  checked: Checked,
  rows: ReadonlyArray<ReadonlyArray<unknown>>
): ReadonlyArray<ReadonlyArray<unknown>> => {
  const k = checked.checks.length
  if (k === 0) return rows
  checked.checks.forEach((test, i) => test(rows[0][i]))
  return rows.slice(1).map((row) => row.slice(k))
}

/** The result rows of a compiled query, after its checks (see {@link verify}), as a frame. @internal */
export const read = (compiled: Compiled, rows: ReadonlyArray<ReadonlyArray<unknown>>): F.Frame =>
  decode(compiled.schema, verify(compiled.query, rows))

/** The rows of a result, one array of values per row, as a frame of `schema`. */
const decode = (schema: S.Schema, rows: ReadonlyArray<ReadonlyArray<unknown>>): F.Frame =>
  F.make(
    schema.fields.map((f, i) => {
      const read = reader(f.type)
      let nullable = false
      const values = rows.map((row) => {
        const v = row[i]
        if (v !== null && v !== undefined) return read(v)
        nullable = true
        return null
      })
      const column = Result.getOrElse(
        ArrowColumn.fromValues(S.field(f.name, f.type, { nullable }), values),
        (error) => V.fail(`column ${JSON.stringify(f.name)}: ${error.message}`)
      )
      return new F.Column(f.name, V.fromArrowData(column.chunks[0]), undefined, nullable)
    }),
    rows.length
  )
