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
import { civil } from "./temporal.ts"
import * as V from "./vector.ts"

/** @internal */
export type Dialect = "duckdb" | "postgres"

interface Compiler {
  readonly dialect: Dialect
  /** The engine's frame for every node of the plan, on zero-row inputs. */
  readonly frames: ReadonlyMap<Plan.Node, F.Frame>
  /** A quoted helper column name, disjoint from the plan's column names. */
  readonly hidden: (name: string) => string
  /** The quoted row key. */
  readonly row: string
}

/** @internal */
export const quote = (name: string): string => `"${name.replaceAll(`"`, `""`)}"`

const list = (names: ReadonlyArray<string>, prefix = "") => names.map((n) => `${prefix}${quote(n)}`).join(", ")

const unsupported = (what: string, dialect: Dialect): never =>
  V.fail(`${what} is not supported by the SQL engine (${dialect})`)

// -----------------------------------------------------------------------------
// Types and literals
// -----------------------------------------------------------------------------

const sqlType = (t: S.DataType, dialect: Dialect): string => {
  switch (t._tag) {
    case "Int":
      if (dialect === "duckdb") {
        return `${t.signed ? "" : "U"}${
          ({ 8: "TINYINT", 16: "SMALLINT", 32: "INTEGER", 64: "BIGINT" } as const)[t.bitWidth]
        }`
      }
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
      return dialect === "duckdb" ? "VARCHAR" : "TEXT"
    case "Binary":
    case "LargeBinary":
    case "BinaryView":
      return dialect === "duckdb" ? "BLOB" : "BYTEA"
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
      return unsupported(`columns of type ${t._tag}`, dialect)
  }
}

/** The type the SQL engine reads a declared table column as. */
const tableType = (table: string, column: Plan.TableColumn, dialect: Dialect): S.DataType => {
  switch (column.type) {
    case "Timestamp":
      return S.timestamp("microsecond")
    case "Duration":
      return S.duration("microsecond")
    case "Binary":
      return S.binary
    case "Null":
      return S.nullType
    default:
      return D.castTargets[column.type] ?? unsupported(
        `column ${JSON.stringify(column.name)} of table ${JSON.stringify(table)}: ${column.type} table columns`,
        dialect
      )
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

const literal = (value: unknown, type: Plan.LiteralType | undefined, dialect: Dialect): string => {
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
      case "Duration": {
        const micros = big * BigInt(1_000_000) / perSecond[type.unit]
        return dialect === "duckdb"
          ? `TO_MICROSECONDS(CAST(${micros} AS BIGINT))`
          : `(${micros} * INTERVAL '1 microsecond')`
      }
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
      return unsupported(`literals like ${String(value)}`, dialect)
  }
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

const isNaNSql = (
  x: string,
  d: Dialect
) => (d === "duckdb" ? `ISNAN(${x})` : `(${x} = ${NAN})`)

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
const round = (x: string, type: S.DataType, result: S.DataType, decimals: number, d: Dialect): string => {
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
      return `CAST(${decimals === 0 ? rounded : `(${rounded} / ${power(decimals)})`} AS ${sqlType(result, d)})`
    }
    default: {
      const rint = (y: string) => d === "duckdb" ? `ROUND_EVEN(${y}, 0)` : `ROUND(${y})`
      if (decimals === 0) return rint(float(x))
      const scale = literal(10 ** decimals, undefined, d)
      return `(${rint(`(${float(x)} * ${float(scale)})`)} / ${float(scale)})`
    }
  }
}

const aggregate = (node: Plan.AggregateCall, scope: Scope, over: string | undefined): string => {
  const d = scope.compiler.dialect
  const row = scope.compiler.row
  const inner = { ...scope, partition: undefined }
  const x = node.arg === undefined ? "" : expression(node.arg, inner)
  const type = node.arg === undefined ? undefined : typeOf(node.arg, inner)._tag
  const o = over === undefined ? "" : ` ${over}`
  switch (node.fn) {
    case "count":
      return node.arg === undefined ? `COUNT(*)${o}` : `COUNT(${x})${o}`
    case "sum":
      if (type === "Duration") {
        return d === "duckdb"
          ? `TO_MICROSECONDS(CAST(COALESCE(SUM(EXTRACT(EPOCH FROM ${x}) * 1000000)${o}, 0) AS BIGINT))`
          : `COALESCE(SUM(${x})${o}, INTERVAL '0 seconds')`
      }
      return `COALESCE(SUM(${type === "Bool" ? `CAST(${x} AS INTEGER)` : x})${o}, 0)`
    case "mean":
      return `AVG(${x})${o}`
    case "min":
    case "max": {
      const fn = node.fn.toUpperCase()
      // Floats: NaN is skipped unless every value is NaN.
      return type === "Float"
        ? `COALESCE(${fn}(CASE WHEN ${isNaNSql(x, d)} THEN NULL ELSE ${x} END)${o}, ${fn}(${x})${o})`
        : `${fn}(${x})${o}`
    }
    case "std":
      return `STDDEV_SAMP(${x})${o}`
    case "variance":
      return `VAR_SAMP(${x})${o}`
    case "median":
      if (over !== undefined) return unsupported("median over partitions", d)
      return d === "duckdb" ? `MEDIAN(${x})` : `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${x})`
    case "countDistinct":
      if (over !== undefined) return unsupported("countDistinct over partitions", d)
      // Nulls count as one value.
      return `(COUNT(DISTINCT ${x}) + CASE WHEN COUNT(*) > COUNT(${x}) THEN 1 ELSE 0 END)`
    case "first":
    case "last": {
      if (over !== undefined) {
        return `${node.fn === "first" ? "FIRST_VALUE" : "LAST_VALUE"}(${x}) OVER (${
          partitionBy(scope, " ")
        }ORDER BY ${row} ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`
      }
      return d === "duckdb"
        ? `${node.fn.toUpperCase()}(${x} ORDER BY ${row})`
        : `(ARRAY_AGG(${x} ORDER BY ${row} ${node.fn === "first" ? "ASC" : "DESC"}))[1]`
    }
    case "list":
      if (over !== undefined) return unsupported("list over partitions", d)
      return d === "duckdb" ? `LIST(${x} ORDER BY ${row})` : `ARRAY_AGG(${x} ORDER BY ${row})`
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
  const d = scope.compiler.dialect
  const row = scope.compiler.row
  const a = node.args.map((x) => expression(x, scope))
  const k = node.args.map((x) => typeOf(x, scope)._tag)
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
        ? `((${a[0]} - (${intMod()})) ${d === "duckdb" ? "//" : "/"} NULLIF(${a[1]}, 0))`
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
      return round(a[0], typeOf(node.args[0], scope), typeOf(node, scope), o.decimals ?? 0, d)
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
    case "between":
      return `(${a[0]} BETWEEN ${a[1]} AND ${a[2]})`
    case "isIn": {
      const values = (o.values ?? []).filter((v) => v !== null)
      return values.length === 0 ?
        `(${a[0]} IS NULL AND NULL)` :
        `(${a[0]} IN (${values.map((v) => literal(v, undefined, d)).join(", ")}))`
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
      return isNaNSql(a[0], d)
    case "fillNull":
    case "coalesce":
      return `COALESCE(${a.join(", ")})`
    case "when":
      return `(CASE WHEN ${a[0]} THEN ${a[1]} ELSE ${a[2]} END)`
    case "cast": {
      const to = o.to ?? ""
      const target = to === "Decimal"
        ? `DECIMAL(${o.precision}, ${o.scale})`
        : sqlType(D.castTargets[to] ?? V.fail(`unknown cast target ${to}`), d)
      const integer = to.startsWith("Int") || to.startsWith("UInt")
      let x = a[0]
      // Temporal values become their integers; floats and decimals truncate (as the engine does).
      if (integer && k[0] === "Timestamp") {
        x = d === "duckdb"
          ? `EPOCH_US(${x})`
          : `CAST(EXTRACT(EPOCH FROM ${x}) * 1000000 AS BIGINT)`
      } else if (integer && k[0] === "Date") x = `(${x} - DATE '1970-01-01')`
      else if (integer && k[0] === "Duration") x = `CAST(EXTRACT(EPOCH FROM ${x}) * 1000000 AS BIGINT)`
      else if (integer && (k[0] === "Decimal" || k[0] === "Float")) x = `TRUNC(${x})`
      return d === "duckdb" ? `TRY_CAST(${x} AS ${target})` : `CAST(${x} AS ${target})`
    }
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
      const fn = node.fn === "cumMin" ? "MIN" : "MAX"
      // Floats: NaN is skipped (it stays only while no other value was seen).
      const value = k[0] === "Float"
        ? `COALESCE(${fn}(CASE WHEN ${isNaNSql(a[0], d)} THEN NULL ELSE ${a[0]} END) ${window(scope, running)}, ${
          a[0]
        })`
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
        ? `CASE WHEN MAX(CASE WHEN ${isNaNSql(a[0], d)} THEN 1 ELSE 0 END) ${
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
      const unit = truncateUnits[o.every ?? ""] ?? unsupported(`truncate to ${o.every}`, d)
      return k[0] === "Date" ? `CAST(DATE_TRUNC('${unit}', ${a[0]}) AS DATE)` : `DATE_TRUNC('${unit}', ${a[0]})`
    }
    case "totalDays":
    case "totalHours":
    case "totalMinutes":
    case "totalSeconds":
    case "totalMilliseconds":
      return `CAST(TRUNC(EXTRACT(EPOCH FROM ${a[0]}) / ${totalSeconds[node.fn]}) AS BIGINT)`
    case "listLength":
      return d === "duckdb"
        ? `CAST(LEN(${a[0]}) AS BIGINT)`
        : `COALESCE(CARDINALITY(${a[0]}), CASE WHEN ${a[0]} IS NULL THEN NULL ELSE 0 END)`
    case "listGet": {
      const i = o.index ?? 0
      return d === "duckdb"
        ? `${a[0]}[${i >= 0 ? i + 1 : i}]`
        : `${a[0]}[${i >= 0 ? `${i + 1}` : `CARDINALITY(${a[0]}) + ${i + 1}`}]`
    }
    case "listSum":
    case "listMean":
    case "listMin":
    case "listMax": {
      if (d !== "duckdb") return unsupported(node.fn, d)
      const fn = { listSum: "LIST_SUM", listMean: "LIST_AVG", listMin: "LIST_MIN", listMax: "LIST_MAX" }[node.fn]
      return node.fn === "listSum"
        ? `(CASE WHEN ${a[0]} IS NULL THEN NULL ELSE COALESCE(${fn}(${a[0]}), 0) END)`
        : `${fn}(${a[0]})`
    }
    case "listContains":
      return d === "duckdb"
        ? `LIST_CONTAINS(${a[0]}, ${a[1]})`
        : `(CASE WHEN ${a[0]} IS NULL THEN NULL ELSE ${a[1]} = ANY(${a[0]}) END)`
    case "field":
      return `(${a[0]}).${quote(o.name ?? "")}`
    case "struct": {
      if (d !== "duckdb") return unsupported("struct", d)
      const names = o.names ?? []
      return `STRUCT_PACK(${a.map((x, i) => `${quote(names[i])} := ${x}`).join(", ")})`
    }
  }
}

const expression = (node: Plan.Expression, scope: Scope): string => {
  switch (node._tag) {
    case "Column":
      return quote(node.name)
    case "Literal":
      return literal(node.value, node.type, scope.compiler.dialect)
    case "Call":
      return call(node, scope)
    case "AggregateCall":
      return scope.partition === undefined
        ? V.fail(`aggregate ${node.fn} can only be used in agg or over`)
        : aggregate(node, scope, `OVER (${partitionBy(scope)})`)
    case "Over":
      return expression(node.expression, {
        ...scope,
        partition: node.partitionBy.map((k) => expression(k, { ...scope, partition: undefined }))
      })
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
const typed = (node: Plan.Node, frames: Map<Plan.Node, F.Frame>, dialect: Dialect): F.Frame => {
  const known = frames.get(node)
  if (known !== undefined) return known
  let frame: F.Frame
  if (unsupportedNodes.has(node._tag)) return unsupported(node._tag, dialect)
  if (node._tag === "Table") {
    const columns = node.columns ?? V.fail(
      `the SQL engine needs the columns of table ${JSON.stringify(node.name)}: use Query.table with a schema`
    )
    frame = F.fromVectors(
      columns.map((c) => c.name),
      columns.map((c) => K.nullsOf(tableType(node.name, c, dialect), 0)),
      0
    )
  } else if (node._tag === "Values") {
    frame = F.slice(node.frame as unknown as F.Frame, 0, 0)
  } else {
    const inputs = Q.children(node as Q.Node).map((n) => typed(n as Plan.Node, frames, dialect))
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

const scopeOf = (node: Plan.Node, compiler: Compiler): Scope => ({
  compiler,
  frame: compiler.frames.get(node)!,
  partition: undefined
})

const values = (frame: F.Frame, c: Compiler): string => {
  const d = c.dialect
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
          }, d)
        case "Timestamp":
          return literal(raw[i], { _tag: "Timestamp", unit: type.unit, timezone: type.timezone }, d)
        case "Duration":
          return literal(raw[i], { _tag: "Duration", unit: type.unit }, d)
        case "Decimal":
          return literal(raw[i], { _tag: "Decimal", precision: type.precision, scale: type.scale }, d)
        default: {
          const v = values![i]
          return typeof v === "bigint" ? String(v) : literal(v, undefined, d)
        }
      }
    }
    const sql = sqlType(type, d)
    return { name: quote(col.name), cell: (i: number) => `CAST(${V.isValid(vector, i) ? value(i) : "NULL"} AS ${sql})` }
  })
  if (frame.length === 0) {
    const nulls = frame.columns.map((col, i) => `CAST(NULL AS ${sqlType(col.type, d)}) AS ${columns[i].name}`)
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
      return `SELECT ${[...columns.map(quote), `ROW_NUMBER() OVER () AS ${row}`].join(", ")} FROM ${quote(node.name)}`
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
      return `SELECT ${keep} FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY ${
        list(node.columns ?? columns)
      } ORDER BY ${row}) AS ${k} FROM ${from("s")}) AS t WHERE ${k} = 1`
    }
    case "DropNulls": {
      const keys = node.columns ?? columns
      return `SELECT * FROM ${from()}${
        keys.length === 0 ? "" : ` WHERE ${keys.map((k) => `${quote(k)} IS NOT NULL`).join(" AND ")}`
      }`
    }
    case "GroupBy":
    case "Aggregate": {
      const s = scope()
      const keys = node._tag === "GroupBy" ? node.keys : []
      const aggs = node.aggregates.map((a) =>
        `${aggregate(a.expression as Plan.AggregateCall, s, undefined)} AS ${quote(a.name)}`
      )
      const key = keys.length === 0 ? `1 AS ${row}` : `MIN(${row}) AS ${row}`
      return `SELECT ${[...keys.map(quote), ...aggs, key].join(", ")} FROM ${from()}${
        keys.length === 0 ? "" : ` GROUP BY ${list(keys)}`
      }`
    }
    case "Join": {
      const l = relation(node.left, c)
      const r = relation(node.right, c)
      const on = node.on.map((k) => `l.${quote(k)} = r.${quote(k)}`).join(" AND ")
      if (node.how === "semi" || node.how === "anti") {
        return `SELECT * FROM (${l}) AS l WHERE ${
          node.how === "anti" ? "NOT " : ""
        }EXISTS (SELECT 1 FROM (${r}) AS r WHERE ${on})`
      }
      const rightOnly = columnsOf(node.right, c).filter((name) => !node.on.includes(name))
      const left = columnsOf(node.left, c).map((name) =>
        node.how === "full" && node.on.includes(name)
          ? `COALESCE(l.${quote(name)}, r.${quote(name)}) AS ${quote(name)}`
          : `l.${quote(name)}`
      )
      const join = node.how === "inner" ? "INNER JOIN" : node.how === "left" ? "LEFT JOIN" : "FULL JOIN"
      return `SELECT ${
        [...left, ...rightOnly.map((name) => `r.${quote(name)}`)].join(", ")
      }, ROW_NUMBER() OVER (ORDER BY l.${row}${
        node.how === "full" ? " NULLS LAST" : ""
      }, r.${row}) AS ${row} FROM (${l}) AS l ${join} (${r}) AS r ON ${on}`
    }
    case "Concat": {
      const source = c.hidden("source")
      const union = node.inputs
        .map((n, i) => `SELECT ${keep}, ${i} AS ${source} FROM (${relation(n, c)}) AS t${i}`)
        .join(" UNION ALL ")
      return renumbered(union, `${source}, ${row}`)
    }
    case "Pivot":
    case "Unpivot":
    case "Explode":
    case "Unnest":
      return unsupported(node._tag, c.dialect)
  }
}

// -----------------------------------------------------------------------------
// Results
// -----------------------------------------------------------------------------

/** A temporal value as an integer in `unit` since the epoch (or as a length). */
const epoch = (x: string, type: S.Timestamp | S.Duration, d: Dialect): string => {
  if (d === "duckdb" && type._tag === "Timestamp") {
    return type.unit === "second" ?
      `CAST(FLOOR(EPOCH_MS(${x}) / 1000.0) AS BIGINT)` :
      `EPOCH_${({ millisecond: "MS", microsecond: "US", nanosecond: "NS" } as const)[type.unit]}(${x})`
  }
  return `CAST(FLOOR(EXTRACT(EPOCH FROM ${x}) * ${perSecond[type.unit]}) AS BIGINT)`
}

const scalars: ReadonlySet<S.DataType["_tag"]> = new Set(["Null", "Bool", "Int", "Float", "Decimal", "Utf8"])

/** SQL that renders a result column of `type` in the form `reader` reads. */
const output = (x: string, type: S.DataType, d: Dialect): string => {
  const text = (y: string) => `CAST(${y} AS ${d === "duckdb" ? "VARCHAR" : "TEXT"})`
  switch (type._tag) {
    case "Null":
      return "NULL"
    case "Bool":
    case "Int":
    case "Float":
    case "Decimal":
    case "Utf8":
      return text(`CAST(${x} AS ${sqlType(type, d)})`)
    case "Date":
      return text(`(CAST(${x} AS DATE) - DATE '1970-01-01')${type.unit === "day" ? "" : " * 86400000"}`)
    case "Timestamp":
    case "Duration":
      return text(epoch(x, type, d))
    case "Binary":
      return x
    case "List":
      if (scalars.has(type.child.type._tag)) return `CAST(${x} AS ${d === "duckdb" ? "VARCHAR" : "TEXT"}[])`
  }
  return unsupported(`results of type ${D.describe(type)}`, d)
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

/** @internal */
export interface Compiled {
  readonly sql: string
  readonly schema: S.Schema
}

/** A plan as one SQL query, its rows in the plan's row order. @internal */
export const compile = (plan: Plan.Node, dialect: Dialect): Compiled => {
  const frames = new Map<Plan.Node, F.Frame>()
  const result = typed(plan, frames, dialect)
  const used = new Set<string>()
  for (const frame of frames.values()) for (const col of frame.columns) used.add(col.name)
  let prefix = "__"
  while ([...used].some((name) => name.startsWith(prefix))) prefix += "_"
  const hidden = (name: string) => quote(prefix + name)
  const compiler: Compiler = { dialect, frames, hidden, row: hidden("row") }
  const sql = relation(plan, compiler)
  const columns = result.columns.map((col) => `${output(quote(col.name), col.type, dialect)} AS ${quote(col.name)}`)
  return {
    sql: `SELECT ${columns.length === 0 ? "1" : columns.join(", ")} FROM (${sql}) AS t ORDER BY ${compiler.row}`,
    schema: S.make(result.columns.map((col) => S.field(col.name, col.type, { nullable: true })))
  }
}

/** The rows of a compiled query's result, one array of values per row, as a frame. @internal */
export const decode = (schema: S.Schema, rows: ReadonlyArray<ReadonlyArray<unknown>>): F.Frame =>
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
