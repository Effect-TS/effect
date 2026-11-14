/**
 * Compiling plans to SQL.
 *
 * Every relation the compiler builds carries a hidden `__row` column: a key
 * that increases in row order. Operations keep it (filters, projections),
 * redefine it (sorts, joins, concatenations: `ROW_NUMBER()` over the new
 * order) or derive it (groups: the first row's `__row`), and the final
 * query orders by it. This reproduces the row order of the in-memory
 * engine: stable sorts, groups in order of first appearance, joins in left
 * row order, `first`/`last` by row order, windows over rows in order.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import type * as Plan from "../Plan.ts"
import * as F from "./frame.ts"
import { civil } from "./temporal.ts"
import * as V from "./vector.ts"

/** @internal */
export type Dialect = "duckdb" | "postgres"

/** What the compiler knows about a column's type (enough to pick SQL that keeps the engine's semantics). */
type Kind = "int" | "float" | "string" | "bool" | "date" | "timestamp" | "duration" | "decimal" | undefined

interface Relation {
  /** A SELECT whose columns are `columns` plus `__row`. */
  readonly sql: string
  readonly columns: ReadonlyArray<string>
  readonly kinds: ReadonlyArray<Kind>
}

const kindOfType = (t: S.DataType): Kind => {
  switch (t._tag) {
    case "Int":
      return "int"
    case "Float":
      return "float"
    case "Utf8":
    case "LargeUtf8":
    case "Utf8View":
      return "string"
    case "Bool":
      return "bool"
    case "Date":
      return "date"
    case "Timestamp":
      return "timestamp"
    case "Duration":
      return "duration"
    case "Decimal":
      return "decimal"
    default:
      return undefined
  }
}

const kindOfName = (name: Plan.TypeName): Kind =>
  name.startsWith("Int") || name.startsWith("UInt")
    ? "int"
    : name.startsWith("Float")
    ? "float"
    : name === "Utf8"
    ? "string"
    : name === "Bool"
    ? "bool"
    : name === "Date"
    ? "date"
    : name === "Timestamp"
    ? "timestamp"
    : name === "Duration"
    ? "duration"
    : name === "Decimal"
    ? "decimal"
    : undefined

const ROW = `"__row"`

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

const castTypes: Record<string, S.DataType> = {
  Int8: S.int8,
  Int16: S.int16,
  Int32: S.int32,
  Int64: S.int64,
  UInt8: S.uint8,
  UInt16: S.uint16,
  UInt32: S.uint32,
  UInt64: S.uint64,
  Float32: S.float32,
  Float64: S.float64,
  Utf8: S.utf8,
  Bool: S.bool,
  Date: S.date("day"),
  "Timestamp[s]": S.timestamp("second"),
  "Timestamp[ms]": S.timestamp("millisecond"),
  "Timestamp[us]": S.timestamp("microsecond"),
  "Timestamp[ns]": S.timestamp("nanosecond"),
  "Duration[s]": S.duration("second"),
  "Duration[ms]": S.duration("millisecond"),
  "Duration[us]": S.duration("microsecond"),
  "Duration[ns]": S.duration("nanosecond")
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
        return `TIMESTAMP '${timestampText(big, type.unit)}'`
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
      if (Number.isNaN(value)) return `CAST('NaN' AS DOUBLE PRECISION)`
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
  readonly dialect: Dialect
  /** The PARTITION BY of an enclosing `over`. */
  readonly partition: string | undefined
  /** Kinds of the input's columns. */
  readonly kinds: ReadonlyMap<string, Kind>
}

const castKinds: Record<string, Kind> = {
  Utf8: "string",
  Bool: "bool",
  Date: "date",
  Decimal: "decimal"
}

/** The kind of an expression's result, when the compiler can tell. */
const kindOf = (node: Plan.Expression, scope: Scope): Kind => {
  switch (node._tag) {
    case "Column":
      return scope.kinds.get(node.name)
    case "Literal":
      if (node.type !== undefined) return node.type._tag.toLowerCase() as Kind
      return typeof node.value === "number"
        ? Number.isInteger(node.value) && !Object.is(node.value, -0) ? "int" : "float"
        : typeof node.value === "bigint"
        ? "int"
        : typeof node.value === "string"
        ? "string"
        : typeof node.value === "boolean"
        ? "bool"
        : undefined
    case "Over":
      return kindOf(node.expression, scope)
    case "AggregateCall":
      return node.fn === "count" || node.fn === "countDistinct"
        ? "int"
        : node.fn === "mean" || node.fn === "median" || node.fn === "std" || node.fn === "variance"
        ? "float"
        : node.arg === undefined
        ? undefined
        : kindOf(node.arg, scope)
    case "Call": {
      const a = node.args.map((x) => kindOf(x, scope))
      switch (node.fn) {
        case "add":
        case "subtract":
        case "multiply":
        case "floorDivide":
        case "mod":
          if (a[0] === "timestamp" || a[1] === "timestamp") {
            return node.fn === "subtract" && a[0] === a[1]
              ? "duration"
              : "timestamp"
          }
          if (a[0] === "date" && a[1] === "date") return "duration"
          return a[0] === "int" && a[1] === "int"
            ? "int"
            : a[0] === "decimal" || a[1] === "decimal"
            ? "decimal"
            : a[0] && a[1]
            ? "float"
            : undefined
        case "divide":
        case "sqrt":
        case "rollingMean":
          return "float"
        case "negate":
        case "abs":
        case "round":
        case "cumSum":
        case "cumMin":
        case "cumMax":
        case "shift":
        case "diff":
        case "rollingSum":
        case "rollingMin":
        case "rollingMax":
        case "fillNull":
        case "coalesce":
        case "truncate":
          return a[0]
        case "when":
          return a[1] ?? a[2]
        case "cast": {
          const to = node.options?.to ?? ""
          return castKinds[to] ??
            (to.startsWith("Int") || to.startsWith("UInt")
              ? "int"
              : to.startsWith("Float")
              ? "float"
              : to.startsWith("Timestamp")
              ? "timestamp"
              : to.startsWith("Duration")
              ? "duration"
              : undefined)
        }
        case "length":
        case "cumCount":
        case "rank":
        case "year":
        case "month":
        case "day":
        case "hour":
        case "minute":
        case "second":
        case "millisecond":
        case "weekday":
        case "ordinalDay":
        case "totalDays":
        case "totalHours":
        case "totalMinutes":
        case "totalSeconds":
        case "totalMilliseconds":
        case "listLength":
          return "int"
        case "toLowerCase":
        case "toUpperCase":
        case "concat":
          return "string"
        default:
          return node.fn === "eq" || node.fn === "neq" || node.fn === "lt" || node.fn === "lte" || node.fn === "gt" ||
              node.fn === "gte" || node.fn === "and" || node.fn === "or" || node.fn === "not" || node.fn === "isNull" ||
              node.fn === "isNotNull" || node.fn === "isNaN" || node.fn === "isIn" || node.fn === "between"
            ? "bool"
            : undefined
      }
    }
  }
}

const isNaNSql = (
  x: string,
  d: Dialect
) => (d === "duckdb" ? `ISNAN(${x})` : `(${x} = CAST('NaN' AS DOUBLE PRECISION))`)

const window = (scope: Scope, frame?: string): string =>
  `OVER (${scope.partition === undefined ? "" : `PARTITION BY ${scope.partition} `}ORDER BY ${ROW}${
    frame === undefined ? "" : ` ${frame}`
  })`

const running = "ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW"

const float = (x: string) => `CAST(${x} AS DOUBLE PRECISION)`

const aggregate = (node: Plan.AggregateCall, scope: Scope, over: string | undefined): string => {
  const d = scope.dialect
  const x = node.arg === undefined ? "" : expression(node.arg, { ...scope, partition: undefined })
  const kind = node.arg === undefined ? undefined : kindOf(node.arg, scope)
  const o = over === undefined ? "" : ` ${over}`
  switch (node.fn) {
    case "count":
      return node.arg === undefined ? `COUNT(*)${o}` : `COUNT(${x})${o}`
    case "sum":
      if (kind === "duration" && d === "duckdb") {
        return `TO_MICROSECONDS(CAST(COALESCE(SUM(EXTRACT(EPOCH FROM ${x}) * 1000000)${o}, 0) AS BIGINT))`
      }
      return `COALESCE(SUM(${x})${o}, 0)`
    case "mean":
      return `AVG(${x})${o}`
    case "min":
    case "max": {
      const fn = node.fn.toUpperCase()
      // Floats: NaN is skipped unless every value is NaN.
      return kind === "float"
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
      return `(COUNT(DISTINCT ${x}) + MAX(CASE WHEN ${x} IS NULL THEN 1 ELSE 0 END))`
    case "first":
    case "last": {
      if (over !== undefined) {
        return `${node.fn === "first" ? "FIRST_VALUE" : "LAST_VALUE"}(${x}) OVER (${
          scope.partition === undefined ? "" : `PARTITION BY ${scope.partition} `
        }ORDER BY ${ROW} ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`
      }
      return d === "duckdb"
        ? `${node.fn.toUpperCase()}(${x} ORDER BY ${ROW})`
        : `(ARRAY_AGG(${x} ORDER BY ${ROW} ${node.fn === "first" ? "ASC" : "DESC"}))[1]`
    }
    case "list":
      if (over !== undefined) return unsupported("list over partitions", d)
      return d === "duckdb" ? `LIST(${x} ORDER BY ${ROW})` : `ARRAY_AGG(${x} ORDER BY ${ROW})`
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
  const d = scope.dialect
  const a = node.args.map((x) => expression(x, scope))
  const k = node.args.map((x) => kindOf(x, scope))
  const ints = k[0] === "int" && k[1] === "int"
  const o = node.options ?? {}
  // Floored modulo of integers, exact, null for a zero divisor.
  const intMod = () => `((${a[0]} % NULLIF(${a[1]}, 0)) + ${a[1]}) % NULLIF(${a[1]}, 0)`
  switch (node.fn) {
    case "add":
      return `(${a[0]} + ${a[1]})`
    case "subtract":
      if (k[0] === "date" && k[1] === "date") return `((${a[0]} - ${a[1]}) * INTERVAL '1 day')`
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
      return `SQRT(${a[0]})`
    case "round":
      return d === "duckdb" ? `ROUND_EVEN(${a[0]}, ${o.decimals ?? 0})` : `ROUND(${a[0]}, ${o.decimals ?? 0})`
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
      return d === "duckdb" ? `ISNAN(${a[0]})` : `(${a[0]} = CAST('NaN' AS DOUBLE PRECISION))`
    case "fillNull":
    case "coalesce":
      return `COALESCE(${a.join(", ")})`
    case "when":
      return `(CASE WHEN ${a[0]} THEN ${a[1]} ELSE ${a[2]} END)`
    case "cast": {
      const to = o.to ?? ""
      const target = to === "Decimal"
        ? `DECIMAL(${o.precision}, ${o.scale})`
        : sqlType(castTypes[to] ?? V.fail(`unknown cast target ${to}`), d)
      const integer = to.startsWith("Int") || to.startsWith("UInt")
      let x = a[0]
      // Temporal values become their integers; decimals truncate (as the engine does).
      if (integer && k[0] === "timestamp") {
        x = d === "duckdb"
          ? `EPOCH_US(${x})`
          : `CAST(EXTRACT(EPOCH FROM ${x}) * 1000000 AS BIGINT)`
      } else if (integer && k[0] === "date") x = `(${x} - DATE '1970-01-01')`
      else if (integer && k[0] === "duration") x = `CAST(EXTRACT(EPOCH FROM ${x}) * 1000000 AS BIGINT)`
      else if (integer && k[0] === "decimal") x = `TRUNC(${x})`
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
      return `(CASE WHEN ${a[0]} IS NULL THEN NULL ELSE SUM(${a[0]}) ${window(scope, running)} END)`
    case "cumMin":
    case "cumMax": {
      const fn = node.fn === "cumMin" ? "MIN" : "MAX"
      // Floats: NaN is skipped (it stays only while no other value was seen).
      const value = k[0] === "float"
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
      const part = scope.partition === undefined ? "" : `PARTITION BY ${scope.partition} `
      const ties = `COUNT(*) OVER (PARTITION BY ${scope.partition === undefined ? "" : `${scope.partition}, `}${a[0]})`
      const ranked = (() => {
        switch (o.method ?? "average") {
          case "min":
            return `RANK() OVER (${part}ORDER BY ${order})`
          case "max":
            return `(RANK() OVER (${part}ORDER BY ${order}) + ${ties} - 1)`
          case "dense":
            return `DENSE_RANK() OVER (${part}ORDER BY ${order})`
          case "ordinal":
            return `ROW_NUMBER() OVER (${part}ORDER BY ${order}, ${ROW})`
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
      const value = k[0] === "float" && (fn === "MIN" || fn === "MAX")
        ? `CASE WHEN MAX(CASE WHEN ${isNaNSql(a[0], d)} THEN 1 ELSE 0 END) ${
          window(scope, frame)
        } = 1 THEN CAST('NaN' AS DOUBLE PRECISION) ELSE ${fn}(${a[0]}) ${window(scope, frame)} END`
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
      return k[0] === "date" ? `CAST(DATE_TRUNC('${unit}', ${a[0]}) AS DATE)` : `DATE_TRUNC('${unit}', ${a[0]})`
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
      return literal(node.value, node.type, scope.dialect)
    case "Call":
      return call(node, scope)
    case "AggregateCall":
      return scope.partition === undefined
        ? V.fail(`aggregate ${node.fn} can only be used in agg or over`)
        : aggregate(node, scope, `OVER (PARTITION BY ${scope.partition})`)
    case "Over": {
      const partition = node.partitionBy.map((k) => expression(k, { ...scope, partition: undefined })).join(", ")
      return expression(node.expression, { ...scope, partition: partition === "" ? undefined : partition })
    }
  }
}

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

const from = (r: Relation, alias = "t") => `(${r.sql}) AS ${alias}`

const rowOrdered = (
  columns: ReadonlyArray<string>,
  kinds: ReadonlyArray<Kind>,
  input: Relation,
  order: string
): Relation => ({
  sql: `SELECT ${list(columns)}${columns.length > 0 ? ", " : ""}ROW_NUMBER() OVER (ORDER BY ${order}) AS ${ROW} FROM ${
    from(input)
  }`,
  columns,
  kinds
})

const values = (frame: F.Frame, dialect: Dialect): Relation => {
  const columns = frame.columns.map((c) => c.name)
  const kinds = frame.columns.map((c) => kindOfType(c.type))
  const types = frame.columns.map((c) => sqlType(c.type, dialect))
  const rows = F.toRows(frame)
  const cell = (v: unknown, i: number): string => {
    const t = frame.columns[i].type
    if (v === null || v === undefined) return `CAST(NULL AS ${types[i]})`
    if (t._tag === "Timestamp" || t._tag === "Date" || t._tag === "Duration" || t._tag === "Decimal") {
      return `CAST(${string(String(v instanceof Object && "toJSON" in v ? (v as any).toJSON() : v))} AS ${types[i]})`
    }
    return `CAST(${literal(v, undefined, dialect)} AS ${types[i]})`
  }
  if (rows.length === 0) {
    return {
      sql: `SELECT ${columns.map((c, i) => `CAST(NULL AS ${types[i]}) AS ${quote(c)}`).join(", ")}${
        columns.length > 0 ? ", " : ""
      }CAST(0 AS BIGINT) AS ${ROW} WHERE FALSE`,
      columns,
      kinds
    }
  }
  const tuples = rows.map((row, r) => `(${[...columns.map((c, i) => cell(row[c], i)), String(r + 1)].join(", ")})`)
  return {
    sql: `SELECT * FROM (VALUES ${tuples.join(", ")}) AS v(${list([...columns, "__row"])})`,
    columns,
    kinds
  }
}

const named = (items: ReadonlyArray<Plan.Named>, scope: Scope) =>
  items.map((c) => `${expression(c.expression, scope)} AS ${quote(c.name)}`)

const same = (r: Relation, sql: string): Relation => ({ sql, columns: r.columns, kinds: r.kinds })

const pick = (r: Relation, columns: ReadonlyArray<string>): ReadonlyArray<Kind> =>
  columns.map((c) => r.kinds[r.columns.indexOf(c)])

const scopeOf = (r: Relation, dialect: Dialect): Scope => ({
  dialect,
  partition: undefined,
  kinds: new Map(r.columns.map((c, i) => [c, r.kinds[i]]))
})

/** @internal */
export const relation = (node: Plan.Node, dialect: Dialect): Relation => {
  const input = () => relation((node as { readonly input: Plan.Node }).input, dialect)
  switch (node._tag) {
    case "Table": {
      if (node.columns === undefined) {
        return V.fail(
          `the SQL engine needs the columns of table ${JSON.stringify(node.name)}: use Query.table with a schema`
        )
      }
      const columns = node.columns.map((c) => c.name)
      return {
        sql: `SELECT ${list(columns)}, ROW_NUMBER() OVER () AS ${ROW} FROM ${quote(node.name)}`,
        columns,
        kinds: node.columns.map((c) => kindOfName(c.type))
      }
    }
    case "Values":
      return values(node.frame as unknown as F.Frame, dialect)
    case "Filter": {
      const r = input()
      return same(r, `SELECT * FROM ${from(r)} WHERE ${expression(node.predicate, scopeOf(r, dialect))}`)
    }
    case "Select": {
      const r = input()
      const scope = scopeOf(r, dialect)
      return {
        sql: `SELECT ${[...named(node.columns, scope), ROW].join(", ")} FROM ${from(r)}`,
        columns: node.columns.map((c) => c.name),
        kinds: node.columns.map((c) => kindOf(c.expression, scope))
      }
    }
    case "WithColumns": {
      const r = input()
      const scope = scopeOf(r, dialect)
      const added = new Map(node.columns.map((c) => [c.name, c.expression]))
      const kept = r.columns.map((c) => {
        const e = added.get(c)
        return e === undefined ? quote(c) : `${expression(e, scope)} AS ${quote(c)}`
      })
      const extra = node.columns.filter((c) => !r.columns.includes(c.name))
      return {
        sql: `SELECT ${[...kept, ...named(extra, scope), ROW].join(", ")} FROM ${from(r)}`,
        columns: [...r.columns, ...extra.map((c) => c.name)],
        kinds: [
          ...r.columns.map((c, i) => {
            const e = added.get(c)
            return e === undefined ? r.kinds[i] : kindOf(e, scope)
          }),
          ...extra.map((c) => kindOf(c.expression, scope))
        ]
      }
    }
    case "Pick": {
      const r = input()
      return {
        sql: `SELECT ${list([...node.columns, "__row"])} FROM ${from(r)}`,
        columns: node.columns,
        kinds: pick(r, node.columns)
      }
    }
    case "Omit": {
      const r = input()
      const columns = r.columns.filter((c) => !node.columns.includes(c))
      return { sql: `SELECT ${list([...columns, "__row"])} FROM ${from(r)}`, columns, kinds: pick(r, columns) }
    }
    case "Rename": {
      const r = input()
      const columns = r.columns.map((c) => node.mapping[c] ?? c)
      return {
        sql: `SELECT ${[...r.columns.map((c, i) => `${quote(c)} AS ${quote(columns[i])}`), ROW].join(", ")} FROM ${
          from(r)
        }`,
        columns,
        kinds: r.kinds
      }
    }
    case "Sort": {
      const r = input()
      const scope = scopeOf(r, dialect)
      const keys = node.keys.map((k) =>
        `${expression(k.expression, scope)} ${k.descending ? "DESC" : "ASC"} NULLS ${node.nullsLast ? "LAST" : "FIRST"}`
      )
      return rowOrdered(r.columns, r.kinds, r, [...keys, ROW].join(", "))
    }
    case "Slice": {
      const r = input()
      if (node.offset >= 0) {
        return same(
          r,
          `SELECT * FROM ${from(r)} ORDER BY ${ROW}${
            node.length === undefined ? "" : ` LIMIT ${node.length}`
          } OFFSET ${node.offset}`
        )
      }
      const upper = node.length === undefined ? "" : ` AND "__i" <= "__n" + ${node.offset} + ${node.length}`
      return same(
        r,
        `SELECT ${
          list([...r.columns, "__row"])
        } FROM (SELECT *, COUNT(*) OVER () AS "__n", ROW_NUMBER() OVER (ORDER BY ${ROW}) AS "__i" FROM ${
          from(r, "s")
        }) AS t WHERE "__i" > "__n" + ${node.offset}${upper}`
      )
    }
    case "Unique": {
      const r = input()
      const keys = node.columns ?? r.columns
      return same(
        r,
        `SELECT ${list([...r.columns, "__row"])} FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY ${
          list(keys)
        } ORDER BY ${ROW}) AS "__k" FROM ${from(r, "s")}) AS t WHERE "__k" = 1`
      )
    }
    case "DropNulls": {
      const r = input()
      const keys = node.columns ?? r.columns
      return same(
        r,
        `SELECT * FROM ${from(r)}${
          keys.length === 0 ? "" : ` WHERE ${keys.map((k) => `${quote(k)} IS NOT NULL`).join(" AND ")}`
        }`
      )
    }
    case "GroupBy":
    case "Aggregate": {
      const r = input()
      const scope = scopeOf(r, dialect)
      const keys = node._tag === "GroupBy" ? node.keys : []
      const aggs = node.aggregates.map((a) =>
        a.expression._tag === "AggregateCall"
          ? `${aggregate(a.expression, scope, undefined)} AS ${quote(a.name)}`
          : V.fail(`${a.name} is not an aggregate expression`)
      )
      const row = keys.length === 0 ? `1 AS ${ROW}` : `MIN(${ROW}) AS ${ROW}`
      return {
        sql: `SELECT ${[...keys.map(quote), ...aggs, row].join(", ")} FROM ${from(r)}${
          keys.length === 0 ? "" : ` GROUP BY ${list(keys)}`
        }`,
        columns: [...keys, ...node.aggregates.map((a) => a.name)],
        kinds: [...pick(r, keys), ...node.aggregates.map((a) => kindOf(a.expression, scope))]
      }
    }
    case "Join": {
      const l = relation(node.left, dialect)
      const rr = relation(node.right, dialect)
      const on = node.on.map((k) => `l.${quote(k)} = r.${quote(k)}`).join(" AND ")
      if (node.how === "semi" || node.how === "anti") {
        return same(
          l,
          `SELECT * FROM (${l.sql}) AS l WHERE ${
            node.how === "anti" ? "NOT " : ""
          }EXISTS (SELECT 1 FROM (${rr.sql}) AS r WHERE ${on})`
        )
      }
      const rightOnly = rr.columns.filter((c) => !node.on.includes(c))
      const clash = rightOnly.find((c) => l.columns.includes(c))
      if (clash !== undefined) return V.fail(`both sides of the join have a column ${JSON.stringify(clash)}`)
      const left = l.columns.map((c) =>
        node.how === "full" && node.on.includes(c)
          ? `COALESCE(l.${quote(c)}, r.${quote(c)}) AS ${quote(c)}`
          : `l.${quote(c)}`
      )
      const join = node.how === "inner" ? "INNER JOIN" : node.how === "left" ? "LEFT JOIN" : "FULL JOIN"
      return {
        sql: `SELECT ${
          [...left, ...rightOnly.map((c) => `r.${quote(c)}`)].join(", ")
        }, ROW_NUMBER() OVER (ORDER BY l.${ROW}${
          node.how === "full" ? " NULLS LAST" : ""
        }, r.${ROW}) AS ${ROW} FROM (${l.sql}) AS l ${join} (${rr.sql}) AS r ON ${on}`,
        columns: [...l.columns, ...rightOnly],
        kinds: [...l.kinds, ...pick(rr, rightOnly)]
      }
    }
    case "Concat": {
      const inputs = node.inputs.map((n) => relation(n, dialect))
      if (inputs.length === 0) return V.fail("concat needs at least one input")
      const columns = inputs[0].columns
      const union = inputs
        .map((r, i) => `SELECT ${list([...columns, "__row"])}, ${i} AS "__source" FROM (${r.sql}) AS t${i}`)
        .join(" UNION ALL ")
      return rowOrdered(columns, inputs[0].kinds, { sql: union, columns, kinds: inputs[0].kinds }, `"__source", ${ROW}`)
    }
    case "Pivot":
    case "Unpivot":
    case "Explode":
    case "Unnest":
      return unsupported(node._tag, dialect)
  }
}

/** A plan as one SQL query, its rows in the plan's row order. @internal */
export const compile = (
  plan: Plan.Node,
  dialect: Dialect
): { readonly sql: string; readonly columns: ReadonlyArray<string> } => {
  const r = relation(plan, dialect)
  return {
    sql: `SELECT ${r.columns.length === 0 ? "1" : list(r.columns)} FROM (${r.sql}) AS t ORDER BY ${ROW}`,
    columns: r.columns
  }
}
