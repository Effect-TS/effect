/**
 * Expression trees and their evaluation over a frame.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as BigDecimal from "../../BigDecimal.ts"
import * as DateTime from "../../DateTime.ts"
import * as Duration from "../../Duration.ts"
import { pipeArguments } from "../../Pipeable.ts"
import type * as Plan from "../Plan.ts"
import * as Agg from "./aggregate.ts"
import * as D from "./dtype.ts"
import * as Hash from "./hash.ts"
import * as K from "./kernels.ts"
import * as Nested from "./nested.ts"
import * as T from "./temporal.ts"
import * as V from "./vector.ts"
import * as W from "./window.ts"

/** @internal */
export const ExprTypeId = "~effect/dataframe/Expr"
/** @internal */
export const AggregateTypeId = "~effect/dataframe/Expr/Aggregate"

/** @internal */
export type Node = Plan.Expression

/** @internal */
export interface Handle {
  readonly node: Node
}

const ExprProto = {
  [ExprTypeId]: { _A: (_: never) => _ },
  pipe() {
    return pipeArguments(this, arguments)
  },
  toJSON(this: Handle) {
    return { _id: "Expr", node: this.node }
  },
  toString(this: Handle) {
    return show(this.node)
  }
}

const AggregateProto = {
  ...ExprProto,
  [AggregateTypeId]: { _A: (_: never) => _ },
  toJSON(this: Handle) {
    return { _id: "Aggregate", node: this.node }
  }
}

/** @internal */
export const makeExpr = <E>(node: Node): E => {
  const self = Object.create(ExprProto)
  self.node = node
  return self
}

/** @internal */
export const makeAggregate = <E>(node: Node): E => {
  const self = Object.create(AggregateProto)
  self.node = node
  return self
}

/** @internal */
export const isExpr = (u: unknown): u is Handle => typeof u === "object" && u !== null && ExprTypeId in u

/** @internal */
export const isAggregate = (u: unknown): u is Handle => typeof u === "object" && u !== null && AggregateTypeId in u

/** @internal */
export const toNode = (u: unknown): Node => isExpr(u) ? u.node : literalNode(u)

/**
 * A plan literal for a JS value: `DateTime`s become microsecond timestamps,
 * `Duration`s microsecond durations and `BigDecimal`s decimals.
 *
 * @internal
 */
export const literalNode = (u: unknown): Plan.Literal => {
  if (DateTime.isDateTime(u)) {
    return {
      _tag: "Literal",
      value: BigInt(DateTime.toEpochMillis(u)) * BigInt(1000),
      type: { _tag: "Timestamp", unit: "microsecond" }
    }
  }
  if (Duration.isDuration(u)) {
    const nanos = Duration.toNanos(u)
    if (nanos._tag === "None") return V.fail("infinite durations cannot be literals")
    const micros = nanos.value / BigInt(1000)
    return { _tag: "Literal", value: micros, type: { _tag: "Duration", unit: "microsecond" } }
  }
  if (BigDecimal.isBigDecimal(u)) {
    const digits = (u.value < BigInt(0) ? -u.value : u.value).toString().length
    return {
      _tag: "Literal",
      value: u.value,
      type: { _tag: "Decimal", precision: Math.max(digits, u.scale, 1), scale: u.scale }
    }
  }
  return { _tag: "Literal", value: u as Plan.Value }
}

/** @internal */
export const call = <E>(
  fn: Plan.FunctionName,
  args: ReadonlyArray<unknown>,
  options?: { readonly [key: string]: unknown }
): E => makeExpr({ _tag: "Call", fn, args: args.map(toNode), options })

/** Readable form of an expression, used by `toString`. @internal */
export const show = (node: Node): string => {
  switch (node._tag) {
    case "Column":
      return `col(${JSON.stringify(node.name)})`
    case "Literal": {
      const value = typeof node.value === "bigint" ? `${node.value}n` : JSON.stringify(node.value) ?? "undefined"
      return node.type === undefined ? value : `${node.type._tag}(${value})`
    }
    case "Call":
      return `${node.fn}(${node.args.map(show).join(", ")}${
        node.options === undefined
          ? ""
          : `, ${JSON.stringify(node.options, (_, v) => typeof v === "bigint" ? `${v}n` : v)}`
      })`
    case "AggregateCall":
      return `${node.fn}(${node.arg === undefined ? "" : show(node.arg)})`
    case "Over":
      return `over(${show(node.expression)}, [${node.partitionBy.map(show).join(", ")}])`
  }
}

// -----------------------------------------------------------------------------
// Evaluation
// -----------------------------------------------------------------------------

/** What an expression is evaluated against. @internal */
export interface Context {
  readonly length: number
  readonly column: (name: string) => V.Vector
  /** The partitions of an enclosing `Over`: window functions run per partition. */
  readonly partition?: W.Partition | undefined
}

const literalOfType = (value: unknown, type: Plan.LiteralType): K.Value => {
  const big = typeof value === "bigint" ? value : BigInt(value as number)
  switch (type._tag) {
    case "Date":
      return K.scalar(V.i32(S.date("day"), Int32Array.of(Number(big))))
    case "Timestamp":
      return K.scalar(V.i64(S.timestamp(type.unit, type.timezone), BigInt64Array.of(big)))
    case "Duration":
      return K.scalar(V.i64(S.duration(type.unit), BigInt64Array.of(big)))
    case "Decimal":
      return K.scalar(V.i64(S.decimal(type.precision, type.scale), BigInt64Array.of(big)))
  }
}

const literal = (value: unknown): K.Value => {
  const { dynamic, type } = D.literalType(value)
  switch (typeof value) {
    case "number":
      return K.scalar(
        type._tag === "Int" ? V.i32(type, Int32Array.of(value)) : V.f64(type, Float64Array.of(value)),
        dynamic
      )
    case "bigint":
      return K.scalar(V.i64(type, BigInt64Array.of(BigInt.asIntN(64, value))))
    case "string":
      return K.scalar(V.stringsFrom(S.utf8, [value]))
    case "boolean":
      return K.scalar(V.bool(Uint8Array.of(value ? 1 : 0)))
    default:
      return K.scalar(V.nulls(1))
  }
}

/** @internal */
export const evaluate = (node: Node, ctx: Context): K.Value => {
  switch (node._tag) {
    case "Column":
      return K.column(ctx.column(node.name))
    case "Literal":
      return node.type === undefined || node.value === null ? literal(node.value) : literalOfType(node.value, node.type)
    case "AggregateCall": {
      // Inside `over`: the partition's aggregate on each of its rows.
      if (ctx.partition === undefined) return V.fail(`aggregate ${show(node)} can only be used in agg or over`)
      if (node.arg === undefined && node.fn !== "count") return V.fail(`${node.fn} needs an argument`)
      const arg = node.arg === undefined ? undefined : evaluateColumn(node.arg, { ...ctx, partition: undefined })
      const values = Agg.aggregate(node.arg === undefined ? "len" : node.fn, arg, ctx.partition)
      return K.column(V.take(values, ctx.partition.ids))
    }
    case "Call":
      return evaluateCall(node, ctx)
    case "Over": {
      const keys = node.partitionBy.map((k) => evaluateColumn(k, { ...ctx, partition: undefined }))
      const g = Hash.groups(keys, ctx.length)
      return evaluate(node.expression, { ...ctx, partition: { ids: g.ids, count: g.count } })
    }
  }
}

const arity: { readonly [F in Plan.FunctionName]: readonly [number, number] } = {
  add: [2, 2],
  subtract: [2, 2],
  multiply: [2, 2],
  divide: [2, 2],
  floorDivide: [2, 2],
  mod: [2, 2],
  negate: [1, 1],
  abs: [1, 1],
  sqrt: [1, 1],
  round: [1, 1],
  eq: [2, 2],
  neq: [2, 2],
  lt: [2, 2],
  lte: [2, 2],
  gt: [2, 2],
  gte: [2, 2],
  between: [3, 3],
  isIn: [1, 1],
  and: [2, 2],
  or: [2, 2],
  not: [1, 1],
  isNull: [1, 1],
  isNotNull: [1, 1],
  isNaN: [1, 1],
  fillNull: [2, 2],
  coalesce: [1, Infinity],
  when: [3, 3],
  cast: [1, 1],
  length: [1, 1],
  toLowerCase: [1, 1],
  toUpperCase: [1, 1],
  includes: [1, 1],
  startsWith: [1, 1],
  endsWith: [1, 1],
  concat: [1, Infinity],
  cumSum: [1, 1],
  cumMin: [1, 1],
  cumMax: [1, 1],
  cumCount: [1, 1],
  shift: [1, 1],
  diff: [1, 1],
  rank: [1, 1],
  rollingSum: [1, 1],
  rollingMean: [1, 1],
  rollingMin: [1, 1],
  rollingMax: [1, 1],
  year: [1, 1],
  month: [1, 1],
  day: [1, 1],
  hour: [1, 1],
  minute: [1, 1],
  second: [1, 1],
  millisecond: [1, 1],
  weekday: [1, 1],
  ordinalDay: [1, 1],
  truncate: [1, 1],
  totalDays: [1, 1],
  totalHours: [1, 1],
  totalMinutes: [1, 1],
  totalSeconds: [1, 1],
  totalMilliseconds: [1, 1],
  listLength: [1, 1],
  listGet: [1, 1],
  listSum: [1, 1],
  listMean: [1, 1],
  listMin: [1, 1],
  listMax: [1, 1],
  listContains: [2, 2],
  field: [1, 1],
  struct: [1, Infinity]
}

const windowFunctions: ReadonlySet<Plan.FunctionName> = new Set<Plan.FunctionName>([
  "cumSum",
  "cumMin",
  "cumMax",
  "cumCount",
  "shift",
  "diff",
  "rank",
  "rollingSum",
  "rollingMean",
  "rollingMin",
  "rollingMax"
])

/**
 * Whether an expression's value on a row depends only on that row: no
 * window functions, `over` or aggregates. Only such expressions commute
 * with filters and slices.
 *
 * @internal
 */
export const isRowWise = (node: Node): boolean => {
  switch (node._tag) {
    case "Column":
    case "Literal":
      return true
    case "Call":
      return !windowFunctions.has(node.fn) && node.args.every(isRowWise)
    case "AggregateCall":
    case "Over":
      return false
  }
}

const arithmetic = {
  add: "add",
  subtract: "sub",
  multiply: "mul",
  divide: "div",
  floorDivide: "floorDiv",
  mod: "mod"
} as const

const evaluateCall = (node: Plan.Call, ctx: Context): K.Value => {
  const n = ctx.length
  const bounds = arity[node.fn]
  if (bounds === undefined) return V.fail(`unknown function ${String(node.fn)}`)
  if (node.args.length < bounds[0] || node.args.length > bounds[1]) {
    return V.fail(
      `${node.fn} takes ${
        bounds[0] === bounds[1]
          ? bounds[0]
          : bounds[1] === Infinity
          ? `at least ${bounds[0]}`
          : `${bounds[0]}–${bounds[1]}`
      } argument(s), got ${node.args.length}`
    )
  }
  const arg = (i: number) => evaluate(node.args[i], ctx)
  const options = node.options ?? {}
  const option = <A>(name: keyof Plan.CallOptions): A => {
    const value = options[name]
    return value === undefined ? V.fail(`${node.fn} needs the ${name} option`) : value as A
  }
  switch (node.fn) {
    case "add":
    case "subtract":
    case "multiply":
    case "divide":
    case "floorDivide":
    case "mod":
      return K.arith(arithmetic[node.fn], arg(0), arg(1), n)
    case "negate":
      return K.unaryNumeric("neg", arg(0))
    case "abs":
    case "sqrt":
      return K.unaryNumeric(node.fn, arg(0))
    case "round":
      return K.unaryNumeric("round", arg(0), options.decimals ?? 0)
    case "eq":
    case "neq":
    case "lt":
    case "lte":
    case "gt":
    case "gte":
      return K.compare(node.fn, arg(0), arg(1), n)
    case "and":
    case "or":
      return K.logical(node.fn, arg(0), arg(1), n)
    case "not":
      return K.not(arg(0))
    case "isNull":
      return K.isNull(arg(0), false)
    case "isNotNull":
      return K.isNull(arg(0), true)
    case "isNaN":
      return K.isNaN_(arg(0))
    case "fillNull":
    case "coalesce":
      return K.coalesce(node.args.map((a) => evaluate(a, ctx)), n)
    case "when":
      return K.when(arg(0), arg(1), arg(2), n)
    case "cast": {
      const to = option<string>("to")
      if (to === "Decimal") {
        return K.castValue(arg(0), S.decimal(option<number>("precision"), option<number>("scale")))
      }
      const target = D.castTargets[to]
      if (target === undefined) return V.fail(`unknown cast target ${to}`)
      return K.castValue(arg(0), target)
    }
    case "isIn":
      return K.isIn(arg(0), option<ReadonlyArray<unknown>>("values"))
    case "between": {
      const x = arg(0)
      return K.logical("and", K.compare("gte", x, arg(1), n), K.compare("lte", x, arg(2), n), n)
    }
    case "length":
      return K.strLength(arg(0))
    case "toLowerCase":
      return K.strMap(arg(0), (s) => s.toLowerCase())
    case "toUpperCase":
      return K.strMap(arg(0), (s) => s.toUpperCase())
    case "includes":
    case "startsWith":
    case "endsWith":
      return K.strMatch(arg(0), node.fn, option<string>("pattern"))
    case "concat":
      return K.strConcat(node.args.map((a) => evaluate(a, ctx)), n)
    case "year":
    case "month":
    case "day":
    case "hour":
    case "minute":
    case "second":
    case "millisecond":
    case "weekday":
    case "ordinalDay":
      return K.column(T.field(node.fn, K.materialize(arg(0), n)))
    case "truncate":
      return K.column(T.truncate(K.materialize(arg(0), n), option<string>("every")))
    case "listLength":
      return K.column(Nested.length(K.materialize(arg(0), n)))
    case "listGet":
      return K.column(Nested.get(K.materialize(arg(0), n), option<number>("index")))
    case "listSum":
    case "listMean":
    case "listMin":
    case "listMax": {
      const fn = node.fn === "listSum" ? "sum" : node.fn === "listMean" ? "mean" : node.fn === "listMin" ? "min" : "max"
      return K.column(Nested.aggregate(fn, K.materialize(arg(0), n)))
    }
    case "listContains":
      return K.column(Nested.contains(K.materialize(arg(0), n), arg(1)))
    case "field":
      return K.column(Nested.field(K.materialize(arg(0), n), option<string>("name")))
    case "struct": {
      const names = option<ReadonlyArray<string>>("names")
      if (names.length !== node.args.length) return V.fail("struct needs one name per argument")
      return K.column(Nested.struct(names, node.args.map((a) => K.materialize(evaluate(a, ctx), n)), n))
    }
    case "totalDays":
    case "totalHours":
    case "totalMinutes":
    case "totalSeconds":
    case "totalMilliseconds":
      return K.column(T.total(node.fn, K.materialize(arg(0), n)))
    case "cumSum":
    case "cumMin":
    case "cumMax":
    case "cumCount":
    case "shift":
    case "diff":
    case "rank":
    case "rollingSum":
    case "rollingMean":
    case "rollingMin":
    case "rollingMax": {
      // The argument is evaluated over all rows, the window per partition.
      const x = K.materialize(evaluate(node.args[0], { ...ctx, partition: undefined }), n)
      const p = ctx.partition ?? W.whole(n)
      switch (node.fn) {
        case "cumSum":
          return K.column(W.cumSum(x, p))
        case "cumMin":
        case "cumMax":
          return K.column(W.cumMinMax(node.fn, x, p))
        case "cumCount":
          return K.column(W.cumCount(x, p))
        case "shift":
          return K.column(W.shift(x, p, options.n ?? 1))
        case "diff":
          return K.arith("sub", K.column(x), K.column(W.shift(x, p, options.n ?? 1)), n)
        case "rank":
          return K.column(W.rank(x, p, options.method ?? "average", options.descending ?? false))
        default: {
          const window = option<number>("window")
          return K.column(W.rolling(node.fn, x, p, window, options.minPeriods ?? window))
        }
      }
    }
  }
}

/** Column names an expression reads. @internal */
export const columns = (node: Node, out: Set<string> = new Set()): Set<string> => {
  switch (node._tag) {
    case "Column":
      out.add(node.name)
      break
    case "Call":
      for (const a of node.args) columns(a, out)
      break
    case "AggregateCall":
      if (node.arg !== undefined) columns(node.arg, out)
      break
    case "Over":
      columns(node.expression, out)
      for (const k of node.partitionBy) columns(k, out)
      break
  }
  return out
}

/** Replaces column references. @internal */
export const mapColumns = (node: Node, f: (name: string) => Node): Node => {
  switch (node._tag) {
    case "Column":
      return f(node.name)
    case "Literal":
      return node
    case "Call":
      return { ...node, args: node.args.map((a) => mapColumns(a, f)) }
    case "AggregateCall":
      return node.arg === undefined ? node : { ...node, arg: mapColumns(node.arg, f) }
    case "Over":
      return {
        ...node,
        expression: mapColumns(node.expression, f),
        partitionBy: node.partitionBy.map((k) => mapColumns(k, f))
      }
  }
}

/** Evaluates to a column of the context's length. @internal */
export const evaluateColumn = (node: Node, ctx: Context): V.Vector => K.materialize(evaluate(node, ctx), ctx.length)
