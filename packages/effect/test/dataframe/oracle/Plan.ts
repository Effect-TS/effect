/**
 * Gold plans as effect/dataframe plans, run through the public API.
 */
import { BigDecimal, Effect, Schema, Stream } from "effect"
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
const decimalOf = (name: string): readonly [number, number] => {
  const [p, s] = name.slice(8, -1).split(",").map(Number)
  return [p, s]
}

const arrowType = (name: Gold.TypeName): ArrowSchema.DataType => {
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

/** The table column declaring a gold column of Arrow type `t`. */
const tableColumn = (name: string, t: ArrowSchema.DataType): Plan.TableColumn => {
  switch (t._tag) {
    case "Int":
      return { name, type: `${t.signed ? "Int" : "UInt"}${t.bitWidth}` as Plan.TypeName, nullable: true }
    case "Float":
      return { name, type: `Float${t.bitWidth}` as Plan.TypeName, nullable: true }
    case "List":
      return { name, type: "List", nullable: true, fields: [tableColumn("item", t.child.type)] }
    case "Struct":
      return { name, type: "Struct", nullable: true, fields: t.fields.map((f) => tableColumn(f.name, f.type)) }
    case "Decimal":
      return { name, type: "Decimal", nullable: true, precision: t.precision, scale: t.scale }
    case "Timestamp":
    case "Duration":
      return { name, type: t._tag, nullable: true, unit: t.unit }
    default:
      return { name, type: t._tag as Plan.TypeName, nullable: true }
  }
}

/** A gold input table as a frame. */
const frameOf = (table: Gold.Table): DataFrame.DataFrame<any> =>
  DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromColumns(
    ArrowSchema.make(table.fields.map((f) => ArrowSchema.field(f.name, arrowType(f.type)))),
    table.fields.map((f) => table.columns[f.name].map((v) => Gold.decodeValue(v, f.type)))
  )))

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

/** Gold option names that differ from the plan's. */
const optionNames: Record<string, keyof Plan.CallOptions> = { prefix: "pattern", suffix: "pattern", field: "name" }

const options = ({ args: _, fn, ...rest }: Gold.Call): Plan.CallOptions | undefined => {
  if (fn === "cast") {
    const to = rest.to as Gold.TypeName
    if (!to.startsWith("decimal[")) return { to: castNames[to] }
    const [precision, scale] = decimalOf(to)
    return { to: "Decimal", precision, scale }
  }
  const entries = Object.entries(rest)
  return entries.length === 0 ? undefined : Object.fromEntries(entries.map(([k, v]) => [optionNames[k] ?? k, v]))
}

const aggregateNames: Record<string, Plan.AggregateName> = { len: "count", nUnique: "countDistinct", var: "variance" }

/** A gold expression as plan data. */
const expression = (e: Gold.Expr): Plan.Expression => {
  if ("over" in e) {
    const o = e as { readonly over: Gold.Expr; readonly partitionBy: ReadonlyArray<Gold.Expr> }
    return { _tag: "Over", expression: expression(o.over), partitionBy: o.partitionBy.map(expression) }
  }
  if ("col" in e) return { _tag: "Column", name: e.col as string }
  if ("lit" in e) {
    const { lit, type } = e as { readonly lit: unknown; readonly type?: Gold.TypeName }
    if (type === undefined) return { _tag: "Literal", value: lit as Plan.Value }
    if (type.startsWith("decimal[")) {
      const [precision, scale] = decimalOf(type)
      const value = BigDecimal.scale(BigDecimal.fromStringUnsafe(lit as string), scale).value
      return { _tag: "Literal", value, type: { _tag: "Decimal", precision, scale } }
    }
    const t = temporal[type]
    return t === undefined
      ? { _tag: "Literal", value: Gold.decodeValue(lit, type) as Plan.Value }
      : { _tag: "Literal", value: lit as number, type: t.literal }
  }
  if ("agg" in e) {
    const a = e as { readonly agg: string; readonly arg?: Gold.Expr }
    return {
      _tag: "AggregateCall",
      fn: aggregateNames[a.agg] ?? a.agg as Plan.AggregateName,
      arg: a.arg === undefined ? undefined : expression(a.arg)
    }
  }
  const call = e as Gold.Call
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
 * How a case's inputs reach the query: inline `Values` nodes, frames in the
 * catalog, or streams of two-row batches in the catalog, declared with their
 * columns.
 */
export type Source = "values" | "frames" | "batches"

/** A case's operations as one plan over its inputs. */
const plan = (gold: Gold.Case, source: Source): Plan.Node => {
  const input = (name: string): Plan.Node =>
    source === "values"
      ? { _tag: "Values", frame: frameOf(gold.inputs[name]) }
      : source === "batches"
      ? { _tag: "Table", name, columns: gold.inputs[name].fields.map((f) => tableColumn(f.name, arrowType(f.type))) }
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
          aggregate: op.aggregate as Plan.PivotAggregate,
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

const batchesOf = (table: Gold.Table): Stream.Stream<DataFrame.DataFrame<any>> =>
  Stream.fromIterable(Array.from({ length: Math.ceil(Gold.rowCount(table) / 2) }, (_, b) =>
    frameOf({
      fields: table.fields,
      columns: Object.fromEntries(
        Object.entries(table.columns).map(([name, values]) => [name, values.slice(b * 2, b * 2 + 2)])
      )
    })))

/**
 * Runs a case: its plan goes through its JSON form (so the codecs are part
 * of what is checked) and then runs as a query.
 */
export const run = (
  gold: Gold.Case,
  source: Source
): Effect.Effect<DataFrame.DataFrame<any>, DataFrame.DataFrameError> => {
  const node = plan(gold, source)
  const json = JSON.parse(JSON.stringify(Schema.encodeSync(Plan.NodeFromJson)(node)))
  const decoded = Schema.decodeUnknownSync(Plan.NodeFromJson)(json)
  const tables = Object.fromEntries(
    Object.entries(gold.inputs).map(([name, t]) => [name, source === "batches" ? batchesOf(t) : frameOf(t)])
  )
  return Query.fromPlan(decoded).pipe(Effect.provide(Catalog.layer(tables)))
}
