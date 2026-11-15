/**
 * Gold plans as effect/dataframe plans, run through the public API.
 */
import { BigDecimal, Effect, Schema } from "effect"
import { ArrowSchema, ArrowTable } from "effect/arrow"
import { Catalog, DataFrame, Plan, Query } from "effect/dataframe"
import * as Result from "effect/Result"
import * as Gold from "./Gold.ts"

const arrowTypes = {
  bool: ArrowSchema.bool,
  i8: ArrowSchema.int8,
  i16: ArrowSchema.int16,
  i32: ArrowSchema.int32,
  i64: ArrowSchema.int64,
  u8: ArrowSchema.uint8,
  u16: ArrowSchema.uint16,
  u32: ArrowSchema.uint32,
  u64: ArrowSchema.uint64,
  f32: ArrowSchema.float32,
  f64: ArrowSchema.float64,
  utf8: ArrowSchema.utf8,
  null: ArrowSchema.nullType,
  date: ArrowSchema.date("day"),
  "datetime[us]": ArrowSchema.timestamp("microsecond"),
  "datetime[ms]": ArrowSchema.timestamp("millisecond"),
  "duration[us]": ArrowSchema.duration("microsecond"),
  "duration[ms]": ArrowSchema.duration("millisecond")
}

/** Temporal gold types: their integer storage type, and the literal type. */
export const temporal: Partial<
  Record<string, { readonly storage: "Int32" | "Int64"; readonly literal: Plan.LiteralType }>
> = {
  date: { storage: "Int32", literal: { _tag: "Date" } },
  "datetime[us]": { storage: "Int64", literal: { _tag: "Timestamp", unit: "microsecond" } },
  "datetime[ms]": { storage: "Int64", literal: { _tag: "Timestamp", unit: "millisecond" } },
  "duration[us]": { storage: "Int64", literal: { _tag: "Duration", unit: "microsecond" } },
  "duration[ms]": { storage: "Int64", literal: { _tag: "Duration", unit: "millisecond" } }
}

/** Precision and scale of a `decimal[p,s]` name. */
export const decimalOf = (name: string): readonly [number, number] => {
  const [p, s] = name.slice(8, -1).split(",").map(Number)
  return [p, s]
}

export const arrowType = (name: Gold.TypeName): ArrowSchema.DataType => {
  if (name.startsWith("decimal[")) return ArrowSchema.decimal(...decimalOf(name))
  if (name.startsWith("list<")) {
    return ArrowSchema.list(ArrowSchema.field("item", arrowType(name.slice(5, -1) as Gold.TypeName)))
  }
  if (name.startsWith("struct<")) {
    return ArrowSchema.struct(Gold.structFields(name).map(([n, t]) => ArrowSchema.field(n, arrowType(t))))
  }
  return (arrowTypes as Record<string, ArrowSchema.DataType>)[name]
}

/** The gold type name of an Arrow type. */
export const typeName = (type: ArrowSchema.DataType): string => {
  if (type._tag === "Decimal") return `decimal[${type.precision},${type.scale}]`
  if (type._tag === "List" || type._tag === "LargeList") return `list<${typeName(type.child.type)}>`
  if (type._tag === "Struct") return `struct<${type.fields.map((f) => `${f.name}:${typeName(f.type)}`).join(",")}>`
  for (const [name, t] of Object.entries(arrowTypes)) {
    if (JSON.stringify(t) === JSON.stringify(type)) return name
  }
  return type._tag
}

/** The table column type name of an Arrow type (nested types as Null: not checked). */
const tableType = (t: ArrowSchema.DataType): Plan.TypeName => {
  switch (t._tag) {
    case "Int":
      return `${t.signed ? "Int" : "UInt"}${t.bitWidth}` as Plan.TypeName
    case "Float":
      return `Float${t.bitWidth}` as Plan.TypeName
    case "Utf8":
    case "Bool":
    case "Date":
    case "Timestamp":
    case "Duration":
    case "Null":
    case "Decimal":
      return t._tag
    default:
      return "Null"
  }
}

/** A gold input table as a frame. */
export const frameOf = (table: Gold.Table): DataFrame.DataFrame<any> => {
  const schema = ArrowSchema.make(table.fields.map((f) => ArrowSchema.field(f.name, arrowType(f.type))))
  const length = table.fields.length === 0 ? 0 : table.columns[table.fields[0].name].length
  const rows = Array.from({ length }, (_, i) => {
    const row: Record<string, unknown> = {}
    for (const f of table.fields) row[f.name] = Gold.decodeValue(table.columns[f.name][i], f.type)
    return row
  })
  return DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromRows(schema, rows)))
}

const castNames: Partial<Record<Gold.TypeName, Plan.CastTarget>> = {
  i8: "Int8",
  i16: "Int16",
  i32: "Int32",
  i64: "Int64",
  u8: "UInt8",
  u16: "UInt16",
  u32: "UInt32",
  u64: "UInt64",
  f32: "Float32",
  f64: "Float64",
  utf8: "Utf8",
  bool: "Bool",
  date: "Date",
  "datetime[us]": "Timestamp[us]",
  "datetime[ms]": "Timestamp[ms]",
  "duration[us]": "Duration[us]",
  "duration[ms]": "Duration[ms]"
}

const floatSpecials = new Set(["NaN", "Infinity", "-Infinity", "-0"])

const literal = (e: { readonly lit: unknown; readonly type?: Gold.TypeName }): Plan.Value =>
  (e.type !== undefined
    ? Gold.decodeValue(e.lit, e.type)
    : typeof e.lit === "string" && floatSpecials.has(e.lit)
    ? Gold.decodeValue(e.lit, "f64")
    : e.lit) as Plan.Value

/** Gold function names that differ from the plan's. */
const functionNames: Record<string, Plan.FunctionName> = {
  sub: "subtract",
  mul: "multiply",
  div: "divide",
  floorDiv: "floorDivide",
  neg: "negate",
  strLength: "length",
  strLower: "toLowerCase",
  strUpper: "toUpperCase",
  strContains: "includes",
  strStartsWith: "startsWith",
  strEndsWith: "endsWith",
  strConcat: "concat"
}

const options = (e: { readonly [option: string]: unknown }): Plan.CallOptions | undefined => {
  switch (e.fn) {
    case "round":
      return { decimals: (e.decimals as number | undefined) ?? 0 }
    case "cast": {
      const to = e.to as string
      if (to.startsWith("decimal[")) {
        const [precision, scale] = decimalOf(to)
        return { to: "Decimal", precision, scale }
      }
      return { to: castNames[to as Gold.TypeName] }
    }
    case "truncate":
      return { every: e.every as string }
    case "listGet":
      return { index: e.index as number }
    case "field":
      return { name: e.field as string }
    case "struct":
      return { names: e.names as ReadonlyArray<string> }
    case "isIn":
      return {
        values: (e.values as ReadonlyArray<unknown>).map((v) =>
          Gold.decodeValue(v, (e.type as Gold.TypeName) ?? "utf8") as Plan.Value
        )
      }
    case "strContains":
      return { pattern: e.pattern as string }
    case "strStartsWith":
      return { pattern: e.prefix as string }
    case "strEndsWith":
      return { pattern: e.suffix as string }
    case "shift":
    case "diff":
      return { n: (e.n as number | undefined) ?? 1 }
    case "rank":
      return {
        method: (e.method as Plan.RankMethod | undefined) ?? "average",
        descending: (e.descending as boolean | undefined) ?? false
      }
    case "rollingSum":
    case "rollingMean":
    case "rollingMin":
    case "rollingMax":
      return { window: e.window as number, minPeriods: (e.minPeriods as number | undefined) ?? (e.window as number) }
    default:
      return undefined
  }
}

const aggregateNames: Record<string, Plan.AggregateName> = { len: "count", nUnique: "countDistinct", var: "variance" }

/** A gold expression as plan data. */
export const expression = (e: Gold.Expr): Plan.Expression => {
  if ("over" in e) {
    const o = e as { readonly over: Gold.Expr; readonly partitionBy: ReadonlyArray<Gold.Expr> }
    return { _tag: "Over", expression: expression(o.over), partitionBy: o.partitionBy.map(expression) }
  }
  if ("col" in e) return { _tag: "Column", name: e.col as string }
  if ("lit" in e) {
    const l = e as { readonly lit: unknown; readonly type?: Gold.TypeName }
    const t = l.type === undefined ? undefined : temporal[l.type]
    if (l.type !== undefined && l.type.startsWith("decimal[")) {
      const [precision, scale] = decimalOf(l.type)
      const value = BigDecimal.scale(BigDecimal.fromStringUnsafe(l.lit as string), scale).value
      return { _tag: "Literal", value, type: { _tag: "Decimal", precision, scale } }
    }
    return t === undefined
      ? { _tag: "Literal", value: literal(l) }
      : { _tag: "Literal", value: l.lit as number, type: t.literal }
  }
  if ("agg" in e) {
    const a = e as { readonly agg: string; readonly arg?: Gold.Expr }
    return {
      _tag: "AggregateCall",
      fn: aggregateNames[a.agg] ?? a.agg as Plan.AggregateName,
      arg: a.arg === undefined || a.agg === "len" ? undefined : expression(a.arg)
    }
  }
  const call = e as { readonly fn: string; readonly args: ReadonlyArray<Gold.Expr>; readonly [option: string]: unknown }
  return {
    _tag: "Call",
    fn: functionNames[call.fn] ?? call.fn as Plan.FunctionName,
    args: call.args.map(expression),
    options: options(call)
  }
}

const named = (record: { readonly [name: string]: Gold.Expr }): Array<Plan.Named> =>
  Object.entries(record).map(([name, e]) => ({ name, expression: expression(e) }))

/**
 * A case's operations as one plan over its inputs. Inputs are `Table` nodes
 * read from the catalog, or with `inline`, `Values` nodes holding the frames.
 */
export const plan = (gold: Gold.Case, inline: boolean, declare = false): Plan.Node => {
  const columns = (name: string): Array<Plan.TableColumn> =>
    gold.inputs[name].fields.map((f) => ({ name: f.name, type: tableType(arrowType(f.type)), nullable: true }))
  const input = (name: string): Plan.Node =>
    inline
      ? { _tag: "Values", frame: frameOf(gold.inputs[name]) }
      : declare
      ? { _tag: "Table", name, columns: columns(name) }
      : { _tag: "Table", name }
  let node = input("left")
  for (const op of gold.ops) {
    switch (op.op) {
      case "filter":
        node = { _tag: "Filter", input: node, predicate: expression(op.predicate) }
        break
      case "select":
        node = { _tag: "Select", input: node, columns: named(op.exprs) }
        break
      case "withColumns":
        node = { _tag: "WithColumns", input: node, columns: named(op.exprs) }
        break
      case "pick":
        node = { _tag: "Pick", input: node, columns: op.columns }
        break
      case "omit":
        node = { _tag: "Omit", input: node, columns: op.columns }
        break
      case "rename":
        node = { _tag: "Rename", input: node, mapping: op.mapping }
        break
      case "sort":
        node = {
          _tag: "Sort",
          input: node,
          keys: op.keys.map((k) => ({ expression: expression(k.expr), descending: k.descending ?? false })),
          nullsLast: op.nullsLast ?? false
        }
        break
      case "head":
        node = { _tag: "Slice", input: node, offset: 0, length: op.n }
        break
      case "tail":
        node = op.n === 0
          ? { _tag: "Slice", input: node, offset: 0, length: 0 }
          : { _tag: "Slice", input: node, offset: -op.n }
        break
      case "slice":
        node = { _tag: "Slice", input: node, offset: op.offset, length: op.length }
        break
      case "groupBy":
        node = { _tag: "GroupBy", input: node, keys: op.keys, aggregates: named(op.aggs) }
        break
      case "agg":
        node = { _tag: "Aggregate", input: node, aggregates: named(op.aggs) }
        break
      case "join":
        node = { _tag: "Join", left: node, right: input(op.right), on: op.on, how: op.how }
        break
      case "unique":
        node = { _tag: "Unique", input: node, columns: op.columns }
        break
      case "dropNulls":
        node = { _tag: "DropNulls", input: node, columns: op.columns }
        break
      case "concat":
        node = { _tag: "Concat", inputs: [node, input(op.with)] }
        break
      case "pivot":
        node = {
          _tag: "Pivot",
          input: node,
          on: op.on,
          index: op.index,
          values: op.values,
          aggregate:
            (op.aggregate === "len" ? "len" : aggregateNames[op.aggregate] ?? op.aggregate) as Plan.PivotAggregate,
          columns: op.columns
        }
        break
      case "explode":
        node = { _tag: "Explode", input: node, column: op.column }
        break
      case "unnest":
        node = { _tag: "Unnest", input: node, column: op.column }
        break
      case "unpivot":
        node = {
          _tag: "Unpivot",
          input: node,
          index: op.index,
          on: op.on,
          variable: op.variable ?? "variable",
          value: op.value ?? "value"
        }
        break
    }
  }
  return node
}

/**
 * Runs a case: its plan goes through its JSON form (so the codecs are part
 * of what is checked) and then runs as a query.
 */
export const run = (gold: Gold.Case, inline: boolean): DataFrame.DataFrame<any> => {
  const json = JSON.parse(JSON.stringify(Schema.encodeSync(Plan.NodeFromJson)(plan(gold, inline))))
  const decoded = Schema.decodeUnknownSync(Plan.NodeFromJson)(json)
  const tables = Object.fromEntries(Object.entries(gold.inputs).map(([name, t]) => [name, frameOf(t)]))
  return Query.fromPlan(decoded).pipe(Effect.provide(Catalog.layer(tables)), Effect.runSync)
}
