/**
 * The DataFrame representation and its operations.
 *
 * A frame is a list of named columns of equal length. Each column is a
 * physical vector plus an optional *selection*: the row indices of the
 * vector that make up the column. `filter`, `sort`, `take` and joins only
 * compose selections; the values are gathered the first time a column is
 * read, and the gathered vector is cached on the column. Columns sharing a
 * selection keep sharing it, so composing it happens once per operation.
 *
 * @internal
 */
import * as ArrowData from "../../arrow/ArrowData.ts"
import * as S from "../../arrow/ArrowSchema.ts"
import * as ArrowTable from "../../arrow/ArrowTable.ts"
import * as Equal from "../../Equal.ts"
import { format } from "../../Formatter.ts"
import * as Hash_ from "../../Hash.ts"
import { NodeInspectSymbol, toJson } from "../../Inspectable.ts"
import { pipeArguments } from "../../Pipeable.ts"
import * as Agg from "./aggregate.ts"
import * as D from "./dtype.ts"
import * as E from "./expr.ts"
import * as Hash from "./hash.ts"
import * as K from "./kernels.ts"
import * as Sort from "./sort.ts"
import * as V from "./vector.ts"

/** @internal */
export const TypeId = "~effect/dataframe/DataFrame"

/** @internal */
export class Column {
  readonly name: string
  readonly vector: V.Vector
  readonly selection: Int32Array | undefined
  /** Whether the column may hold nulls (the Arrow field's `nullable`). */
  readonly nullable: boolean
  private gathered: V.Vector | undefined
  constructor(name: string, vector: V.Vector, selection: Int32Array | undefined, nullable?: boolean) {
    this.name = name
    this.vector = vector
    this.selection = selection
    this.nullable = nullable ?? (vector.kind === "null" || vector.valid !== undefined)
  }
  get type(): S.DataType {
    return this.vector.type
  }
  /** The column's values, gathered through its selection (cached). */
  values(): V.Vector {
    if (this.selection === undefined) return this.vector
    if (this.gathered === undefined) this.gathered = V.take(this.vector, this.selection)
    return this.gathered
  }
  /** The gathered values if they were already read. */
  peek(): V.Vector | undefined {
    return this.selection === undefined ? this.vector : this.gathered
  }
  rename(name: string): Column {
    const c = new Column(name, this.vector, this.selection, this.nullable)
    c.gathered = this.gathered
    return c
  }
}

/** @internal */
export interface Frame {
  readonly [TypeId]: unknown
  readonly columns: ReadonlyArray<Column>
  readonly length: number
  readonly schema: S.Schema
}

const Proto = {
  [TypeId]: { _Row: (_: never) => _ },
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Symbol.iterator](this: Frame) {
    return rows(this)[Symbol.iterator]()
  },
  toJSON(this: Frame) {
    return {
      _id: "DataFrame",
      schema: this.columns.map((c) => ({ name: c.name, type: D.describe(c.type) })),
      length: this.length,
      rows: toJson(toRows(head(this, 10)))
    }
  },
  toString(this: Frame) {
    return render(this)
  },
  [NodeInspectSymbol](this: Frame) {
    return render(this)
  },
  [Equal.symbol](this: Frame, that: unknown): boolean {
    return isFrame(that) && equals(this, that)
  },
  [Hash_.symbol](this: Frame): number {
    let h = Hash_.number(this.length)
    for (const c of this.columns) h = Hash_.combine(h)(Hash_.string(c.name))
    return h
  }
}

/** @internal */
export const isFrame = (u: unknown): u is Frame => typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const make = (columns: ReadonlyArray<Column>, length: number): Frame => {
  const self = Object.create(Proto)
  self.columns = columns
  self.length = length
  let schema: S.Schema | undefined
  Object.defineProperty(self, "schema", {
    enumerable: true,
    get: () => schema ??= S.make(columns.map((c) => S.field(c.name, c.type, { nullable: c.nullable })))
  })
  return self
}

/** @internal */
export const fromVectors = (names: ReadonlyArray<string>, vectors: ReadonlyArray<V.Vector>, length?: number): Frame => {
  const n = length ?? vectors[0]?.length ?? 0
  return make(names.map((name, i) => new Column(name, vectors[i], undefined)), n)
}

/** @internal */
export const columnIndex = (self: Frame, name: string): number => {
  const i = self.columns.findIndex((c) => c.name === name)
  return i < 0 ? V.fail(`unknown column ${JSON.stringify(name)}`) : i
}

/** @internal */
export const column = (self: Frame, name: string): Column => self.columns[columnIndex(self, name)]

/** @internal */
export const context = (self: Frame): E.Context => ({
  length: self.length,
  column: (name) => column(self, name).values()
})

// -----------------------------------------------------------------------------
// Arrow interop and rows
// -----------------------------------------------------------------------------

/** @internal */
export const fromArrowTable = (table: ArrowTable.Table): Frame => {
  const length = table.batches.reduce((s, b) => s + b.length, 0)
  const vectors = table.batches.length === 0
    ? table.schema.fields.map((f) => K.nullsOf(V.storageType(f.type), 0))
    : table.schema.fields.map((_, c) => V.concat(table.batches.map((b) => V.fromArrowData(b.columns[c]))))
  return make(
    table.schema.fields.map((f, c) =>
      new Column(
        f.name,
        vectors[c],
        undefined,
        f.nullable || vectors[c].kind === "null" || vectors[c].valid !== undefined
      )
    ),
    length
  )
}

/** @internal */
export const toArrowTable = (self: Frame): ArrowTable.Table => {
  const schema = S.make(self.columns.map((c) => S.field(c.name, c.type, { nullable: c.nullable })))
  const data = self.columns.map((c) => V.toArrowData(c.values()))
  return ArrowTable.make(schema, [ArrowTable.recordBatch(schema, self.length, data)])
}

/** @internal */
export const rows = (self: Frame): Iterable<any> => ArrowTable.rows(toArrowTable(self))

/** @internal */
export const toRows = (self: Frame): Array<any> => ArrowTable.toRows(toArrowTable(self))

/** @internal */
export const toArray = (self: Frame, name: string): Array<unknown> => {
  const vector = column(self, name).values()
  const field = S.field(name, vector.type)
  const t = ArrowTable.make(S.make([field]), [
    ArrowTable.recordBatch(S.make([field]), vector.length, [V.toArrowData(vector)])
  ])
  return ArrowTable.toRows(t).map((r) => r[name])
}

void ArrowData

// -----------------------------------------------------------------------------
// Row selection
// -----------------------------------------------------------------------------

/** Re-selects every column through `indices` (positions in the current frame; -1 = null). @internal */
export const take = (self: Frame, indices: Int32Array): Frame => {
  let missing = false
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] < 0) {
      missing = true
      break
    }
  }
  const composed = new Map<Int32Array | undefined, Int32Array>()
  const columns = self.columns.map((c) => {
    let sel = composed.get(c.selection)
    if (sel === undefined) {
      if (c.selection === undefined) sel = indices
      else {
        const base = c.selection
        sel = new Int32Array(indices.length)
        for (let i = 0; i < indices.length; i++) {
          const j = indices[i]
          sel[i] = j < 0 ? -1 : base[j]
        }
      }
      composed.set(c.selection, sel)
    }
    return new Column(c.name, c.vector, sel, c.nullable || missing)
  })
  return make(columns, indices.length)
}

const maskIndices = (mask: V.Bool): Int32Array => {
  const n = mask.length
  const m = mask.values
  const v = mask.valid
  const out = new Int32Array(n)
  let k = 0
  if (v === undefined) {
    for (let i = 0; i < n; i++) {
      out[k] = i
      k += m[i]
    }
  } else {
    for (let i = 0; i < n; i++) {
      out[k] = i
      k += m[i] & v[i]
    }
  }
  return out.subarray(0, k)
}

/** @internal */
export const filter = (self: Frame, predicate: E.Node): Frame => {
  const value = E.evaluate(predicate, context(self))
  const mask = K.materialize(value, self.length)
  if (mask.kind === "null") return take(self, new Int32Array(0))
  if (mask.kind !== "bool") return V.fail(`filter predicate must be boolean, got ${D.describe(mask.type)}`)
  const indices = maskIndices(mask)
  return indices.length === self.length ? self : take(self, indices)
}

/** @internal */
export const slice = (self: Frame, start: number, end: number): Frame => {
  const n = self.length
  const s = Math.max(0, Math.min(n, start))
  const e = Math.max(s, Math.min(n, end))
  if (s === 0 && e === n) return self
  return make(
    self.columns.map((c) =>
      c.selection === undefined
        ? new Column(c.name, V.slice(c.vector, s, e), undefined, c.nullable)
        : new Column(c.name, c.vector, c.selection.subarray(s, e), c.nullable)
    ),
    e - s
  )
}

/** @internal */
export const head = (self: Frame, n: number): Frame => slice(self, 0, n)

/** @internal */
export const tail = (self: Frame, n: number): Frame => slice(self, Math.max(0, self.length - n), self.length)

/** @internal */
export const sort = (
  self: Frame,
  keys: ReadonlyArray<{ readonly node: E.Node; readonly descending: boolean }>,
  nullsLast: boolean,
  limit?: number
): Frame => {
  const ctx = context(self)
  const sortKeys = keys.map((k) => ({ vector: E.evaluateColumn(k.node, ctx), descending: k.descending }))
  return take(
    self,
    limit === undefined
      ? Sort.permutation(sortKeys, nullsLast, self.length)
      : Sort.topK(sortKeys, nullsLast, self.length, limit)
  )
}

// -----------------------------------------------------------------------------
// Projection
// -----------------------------------------------------------------------------

/** @internal */
export const pick = (self: Frame, names: ReadonlyArray<string>): Frame =>
  make(names.map((n) => column(self, n)), self.length)

/** @internal */
export const omit = (self: Frame, names: ReadonlyArray<string>): Frame => {
  const drop = new Set(names)
  return make(self.columns.filter((c) => !drop.has(c.name)), self.length)
}

/** @internal */
export const rename = (self: Frame, mapping: { readonly [name: string]: string | undefined }): Frame =>
  make(
    self.columns.map((c) => {
      const to = mapping[c.name]
      return to === undefined ? c : c.rename(to)
    }),
    self.length
  )

const evaluateAll = (self: Frame, exprs: { readonly [name: string]: E.Node }): Array<Column> => {
  const ctx = context(self)
  return Object.keys(exprs).map((name) => new Column(name, E.evaluateColumn(exprs[name], ctx), undefined))
}

/** @internal */
export const select = (self: Frame, exprs: { readonly [name: string]: E.Node }): Frame => {
  const columns = evaluateAll(self, exprs)
  // A frame of only scalars (e.g. `select(() => ({ one: Expr.lit(1) }))`) keeps the frame's length.
  return make(columns, self.length)
}

/** @internal */
export const withColumns = (self: Frame, exprs: { readonly [name: string]: E.Node }): Frame => {
  const added = evaluateAll(self, exprs)
  const byName = new Map(added.map((c) => [c.name, c]))
  const columns: Array<Column> = self.columns.map((c) => {
    const replacement = byName.get(c.name)
    if (replacement !== undefined) byName.delete(c.name)
    return replacement ?? c
  })
  for (const c of added) if (byName.has(c.name)) columns.push(c)
  return make(columns, self.length)
}

// -----------------------------------------------------------------------------
// Aggregation
// -----------------------------------------------------------------------------

const aggregateColumns = (
  self: Frame,
  aggs: { readonly [name: string]: E.Node },
  grouping: Agg.Grouping
): Array<Column> => {
  const ctx = context(self)
  return Object.keys(aggs).map((name) => {
    const node = aggs[name]
    if (node._tag !== "AggregateCall") return V.fail(`${name} is not an aggregate expression`)
    if (node.arg === undefined && node.fn !== "count") return V.fail(`${node.fn} needs an argument`)
    const input = node.arg === undefined ? undefined : E.evaluateColumn(node.arg, ctx)
    return new Column(name, Agg.aggregate(node.arg === undefined ? "len" : node.fn, input, grouping), undefined)
  })
}

/** @internal */
export const groupBy = (self: Frame, keys: ReadonlyArray<string>, aggs: { readonly [name: string]: E.Node }): Frame => {
  const keyVectors = keys.map((k) => column(self, k).values())
  const groups = Hash.groups(keyVectors, self.length)
  const keyColumns = keys.map((k, i) =>
    new Column(k, V.take(keyVectors[i], groups.firstRow), undefined, column(self, k).nullable)
  )
  return make([...keyColumns, ...aggregateColumns(self, aggs, groups)], groups.count)
}

/** @internal */
export const aggregate = (self: Frame, aggs: { readonly [name: string]: E.Node }): Frame =>
  make(aggregateColumns(self, aggs, { ids: new Int32Array(self.length), count: 1 }), 1)

// -----------------------------------------------------------------------------
// Joins
// -----------------------------------------------------------------------------

/** @internal */
export type JoinHow = "inner" | "left" | "full" | "semi" | "anti"

const unifyKeys = (l: V.Vector, r: V.Vector): [V.Vector, V.Vector] => {
  if (D.sameType(l.type, r.type)) return [l, r]
  const st = D.supertype(l.type, undefined, r.type, undefined)
  if (st === undefined) return V.fail(`cannot join ${D.describe(l.type)} with ${D.describe(r.type)}`)
  return [K.cast(l, st.type), K.cast(r, st.type)]
}

/**
 * Key ids for both sides of a join; equal keys get equal ids and rows with a
 * null key (or, on the left, a key the right side lacks) get -1.
 */
const joinIds = (
  pairs: ReadonlyArray<[V.Vector, V.Vector]>,
  nl: number,
  nr: number
): { leftIds: Int32Array; rightIds: Int32Array; count: number; nulls: undefined } => {
  if (pairs.length === 1 && pairs[0][0].kind === "i32" && pairs[0][1].kind === "i32") {
    // One Int32 key: index the right keys directly by value when their range is small.
    const l = pairs[0][0] as V.I32
    const r = pairs[0][1] as V.I32
    let min = 2147483647
    let max = -2147483648
    for (let j = 0; j < nr; j++) {
      if (r.valid !== undefined && r.valid[j] === 0) continue
      const v = r.values[j]
      if (v < min) min = v
      if (v > max) max = v
    }
    if (max < min || max - min < Math.max(1 << 16, 2 * (nl + nr))) {
      const range = max < min ? 0 : max - min + 1
      const table = new Int32Array(range).fill(-1)
      const rightIds = new Int32Array(nr)
      let count = 0
      for (let j = 0; j < nr; j++) {
        if (r.valid !== undefined && r.valid[j] === 0) {
          rightIds[j] = -1
          continue
        }
        const k = r.values[j] - min
        let id = table[k]
        if (id < 0) id = table[k] = count++
        rightIds[j] = id
      }
      const leftIds = new Int32Array(nl)
      const lv = l.values
      const la = l.valid
      for (let i = 0; i < nl; i++) {
        const k = lv[i] - min
        leftIds[i] = (la !== undefined && la[i] === 0) || k < 0 || k >= range ? -1 : table[k]
      }
      return { leftIds, rightIds, count, nulls: undefined }
    }
  }
  // General case: ids over both sides at once.
  const joint = pairs.map(([l, r]) => V.concat([l, r]))
  const g = Hash.groups(joint, nl + nr)
  const nulls = Hash.anyNull(joint, nl + nr)
  const leftIds = g.ids.slice(0, nl)
  const rightIds = g.ids.slice(nl)
  if (nulls !== undefined) {
    for (let i = 0; i < nl; i++) if (nulls[i] === 1) leftIds[i] = -1
    for (let j = 0; j < nr; j++) if (nulls[nl + j] === 1) rightIds[j] = -1
  }
  return { leftIds, rightIds, count: g.count, nulls: undefined }
}

/** @internal */
export const join = (self: Frame, that: Frame, on: ReadonlyArray<string>, how: JoinHow): Frame => {
  const nl = self.length
  const nr = that.length
  const pairs = on.map((k) => unifyKeys(column(self, k).values(), column(that, k).values()))
  const { leftIds, nulls, rightIds, count } = joinIds(pairs, nl, nr)
  // CSR buckets of right rows per id
  const start = new Int32Array(count + 1)
  for (let j = 0; j < nr; j++) if (rightIds[j] >= 0) start[rightIds[j] + 1]++
  for (let k = 0; k < count; k++) start[k + 1] += start[k]
  const rows = new Int32Array(start[count])
  const fill = start.slice(0, count)
  for (let j = 0; j < nr; j++) if (rightIds[j] >= 0) rows[fill[rightIds[j]]++] = j
  const ids = leftIds
  void nulls

  if (how === "semi" || how === "anti") {
    const want = how === "semi" ? 1 : 0
    const keep = new Int32Array(nl)
    let kept = 0
    for (let i = 0; i < nl; i++) {
      const id = ids[i]
      const has = id >= 0 && start[id + 1] > start[id] ? 1 : 0
      keep[kept] = i
      kept += has === want ? 1 : 0
    }
    return kept === nl ? self : take(self, keep.subarray(0, kept))
  }

  let total = 0
  const keepUnmatched = how === "inner" ? 0 : 1
  for (let i = 0; i < nl; i++) {
    const id = ids[i]
    const m = id < 0 ? 0 : start[id + 1] - start[id]
    total += m === 0 ? keepUnmatched : m
  }
  let matchedRight: Uint8Array | undefined
  if (how === "full") matchedRight = new Uint8Array(nr)
  let li = new Int32Array(total)
  let ri = new Int32Array(total)
  let k = 0
  for (let i = 0; i < nl; i++) {
    const id = ids[i]
    const s = id < 0 ? 0 : start[id]
    const e = id < 0 ? 0 : start[id + 1]
    if (s === e) {
      if (keepUnmatched === 1) {
        li[k] = i
        ri[k++] = -1
      }
      continue
    }
    for (let t = s; t < e; t++) {
      li[k] = i
      ri[k++] = rows[t]
    }
    if (matchedRight !== undefined) { for (let t = s; t < e; t++) matchedRight[rows[t]] = 1 }
  }
  if (matchedRight !== undefined) {
    let extra = 0
    for (let j = 0; j < nr; j++) extra += matchedRight[j] ^ 1
    if (extra > 0) {
      const l2 = new Int32Array(total + extra)
      const r2 = new Int32Array(total + extra)
      l2.set(li)
      r2.set(ri)
      for (let j = 0; j < nr; j++) {
        if (matchedRight[j] === 0) {
          l2[k] = -1
          r2[k++] = j
        }
      }
      li = l2
      ri = r2
    }
  }
  const left = take(self, li)
  const keySet = new Set(on)
  const right = take(make(that.columns.filter((c) => !keySet.has(c.name)), nr), ri)
  let leftColumns: ReadonlyArray<Column> = left.columns
  if (how === "full") {
    // Coalesce the key columns: rows that only exist on the right take their keys from there.
    const rightKeys = take(make(on.map((k) => column(that, k)), nr), ri)
    leftColumns = left.columns.map((c) => {
      if (!keySet.has(c.name)) return c
      const [l, r] = unifyKeys(c.values(), column(rightKeys, c.name).values())
      return new Column(c.name, K.coalesce([K.column(l), K.column(r)], li.length).vector, undefined)
    })
  }
  return make([...leftColumns, ...right.columns], li.length)
}

// -----------------------------------------------------------------------------
// Other row operations
// -----------------------------------------------------------------------------

/** @internal */
export const unique = (self: Frame, names: ReadonlyArray<string> | undefined): Frame => {
  const keys = (names ?? self.columns.map((c) => c.name)).map((n) => column(self, n).values())
  const g = Hash.groups(keys, self.length)
  return g.count === self.length ? self : take(self, g.firstRow)
}

/** @internal */
export const dropNulls = (self: Frame, names: ReadonlyArray<string> | undefined): Frame => {
  const keys = (names ?? self.columns.map((c) => c.name)).map((n) => column(self, n).values())
  const nulls = Hash.anyNull(keys, self.length)
  if (nulls === undefined) return self
  const keep: Array<number> = []
  for (let i = 0; i < self.length; i++) if (nulls[i] === 0) keep.push(i)
  return take(self, Int32Array.from(keep))
}

/** @internal */
export const concat = (frames: ReadonlyArray<Frame>): Frame => {
  const first = frames[0]
  const columns = first.columns.map((c) => {
    const parts = frames.map((f) => column(f, c.name).values())
    const type = parts.reduce<S.DataType>((t, p) => {
      const st = D.supertype(t, undefined, p.type, undefined)
      return st === undefined ? V.fail(`cannot concatenate ${D.describe(t)} with ${D.describe(p.type)}`) : st.type
    }, parts[0].type)
    return new Column(c.name, V.concat(parts.map((p) => K.cast(p, type))), undefined)
  })
  return make(columns, frames.reduce((s, f) => s + f.length, 0))
}

// -----------------------------------------------------------------------------
// Equality and rendering
// -----------------------------------------------------------------------------

/** @internal */
export const equals = (a: Frame, b: Frame): boolean => {
  if (a === b) return true
  if (a.length !== b.length || a.columns.length !== b.columns.length) return false
  for (let c = 0; c < a.columns.length; c++) {
    const x = a.columns[c]
    const y = b.columns[c]
    if (x.name !== y.name || !D.sameType(x.type, y.type)) return false
    const vx = x.values()
    const vy = y.values()
    const eq = K.compare("eq", K.column(vx), K.column(vy), a.length).vector as V.Bool
    for (let i = 0; i < a.length; i++) {
      const px = V.isValid(vx, i)
      const py = V.isValid(vy, i)
      if (px !== py || (px && eq.values[i] === 0)) return false
    }
  }
  return true
}

const cell = (u: unknown): string => {
  if (u === null || u === undefined) return "null"
  if (typeof u === "string") return JSON.stringify(u)
  if (typeof u === "bigint") return `${u}`
  if (typeof u === "number") return Object.is(u, -0) ? "-0" : String(u)
  return format(u)
}

/** A text table of the first and last rows. @internal */
export const render = (self: Frame, maxRows = 10): string => {
  const n = self.length
  const shown = n <= maxRows ? toRows(self) : [...toRows(head(self, maxRows / 2)), ...toRows(tail(self, maxRows / 2))]
  const header = self.columns.map((c) => c.name)
  const types = self.columns.map((c) => D.describe(c.type))
  const body = shown.map((r) => header.map((h) => cell(r[h])))
  if (n > maxRows) body.splice(maxRows / 2, 0, header.map(() => "…"))
  const widths = header.map((h, i) => Math.max(h.length, types[i].length, ...body.map((r) => r[i].length)))
  const line = (cells: ReadonlyArray<string>) => `│ ${cells.map((c, i) => c.padEnd(widths[i])).join(" │ ")} │`
  const rule = (l: string, m: string, r: string) => `${l}${widths.map((w) => "─".repeat(w + 2)).join(m)}${r}`
  return [
    `DataFrame (${n} ${n === 1 ? "row" : "rows"} × ${header.length} ${header.length === 1 ? "column" : "columns"})`,
    rule("┌", "┬", "┐"),
    line(header),
    line(types),
    rule("├", "┼", "┤"),
    ...body.map(line),
    rule("└", "┴", "┘")
  ].join("\n")
}

// -----------------------------------------------------------------------------
// Reshaping
// -----------------------------------------------------------------------------

/** @internal */
export const pivot = (
  self: Frame,
  options: {
    readonly on: string
    readonly index: ReadonlyArray<string>
    readonly values: string
    readonly aggregate: Agg.AggFn
    readonly columns?: ReadonlyArray<string> | undefined
  }
): Frame => {
  const n = self.length
  const indexVectors = options.index.map((k) => column(self, k).values())
  const rows = Hash.groups(indexVectors, n)
  const on = column(self, options.on).values()
  const cols = Hash.groups([on], n)
  const cells = Hash.groups([V.i32(S.int32, rows.ids), V.i32(S.int32, cols.ids)], n)
  const input = column(self, options.values).values()
  const fn = options.aggregate
  const values = Agg.aggregate(fn, fn === "len" ? undefined : input, { ids: cells.ids, count: cells.count })
  // The aggregate of no rows, for cells without rows, at index `cells.count`.
  const empty = Agg.aggregate(fn, fn === "len" ? undefined : V.slice(input, 0, 0), {
    ids: new Int32Array(0),
    count: 1
  })
  const all = V.concat([values, K.cast(empty, values.type)])
  const cellOf = new Int32Array(rows.count * cols.count).fill(cells.count)
  for (let c = 0; c < cells.count; c++) {
    const r = cells.firstRow[c]
    cellOf[rows.ids[r] * cols.count + cols.ids[r]] = c
  }
  const names = K.cast(V.take(on, cols.firstRow), S.utf8)
  const nameOf = (j: number): string => V.isValid(names, j) ? V.decodeString(names as V.Str, j) : "null"
  const byName = new Map<string, number>()
  for (let j = 0; j < cols.count; j++) if (!byName.has(nameOf(j))) byName.set(nameOf(j), j)
  const outputs = options.columns ?? Array.from({ length: cols.count }, (_, j) => nameOf(j))
  const columns = outputs.map((name) => {
    const j = byName.get(name)
    const indices = new Int32Array(rows.count)
    for (let r = 0; r < rows.count; r++) indices[r] = j === undefined ? cells.count : cellOf[r * cols.count + j]
    return new Column(name, V.take(all, indices), undefined)
  })
  const keys = options.index.map((k, i) =>
    new Column(k, V.take(indexVectors[i], rows.firstRow), undefined, column(self, k).nullable)
  )
  return make([...keys, ...columns], rows.count)
}

/**
 * One row per list element, the other columns repeated. A null list gives one
 * row with a null element; an empty list gives no rows (Polars).
 *
 * @internal
 */
export const explode = (self: Frame, name: string): Frame => {
  const v = column(self, name).values()
  if (v.kind !== "list") return V.fail(`explode is defined for list columns, not ${D.describe(v.type)}`)
  const rows: Array<number> = []
  const elements: Array<number> = []
  for (let i = 0; i < v.length; i++) {
    if (!V.isValid(v, i)) {
      rows.push(i)
      elements.push(-1)
      continue
    }
    for (let e = v.offsets[i]; e < v.offsets[i + 1]; e++) {
      rows.push(i)
      elements.push(e)
    }
  }
  const repeated = take(self, Int32Array.from(rows))
  const exploded = new Column(name, V.take(v.child, Int32Array.from(elements)), undefined)
  return make(repeated.columns.map((c) => (c.name === name ? exploded : c)), rows.length)
}

/** The fields of a struct column as columns, in its place. @internal */
export const unnest = (self: Frame, name: string): Frame => {
  const v = column(self, name).values()
  if (v.kind !== "struct") return V.fail(`unnest is defined for struct columns, not ${D.describe(v.type)}`)
  const fields = (v.type as S.Struct).fields
  const existing = new Set(self.columns.map((c) => c.name).filter((n) => n !== name))
  const columns: Array<Column> = []
  for (const c of self.columns) {
    if (c.name !== name) {
      columns.push(c)
      continue
    }
    fields.forEach((f, k) => {
      if (existing.has(f.name)) V.fail(`unnest would duplicate the column ${JSON.stringify(f.name)}`)
      const child = v.children[k]
      const valid = v.valid === undefined
        ? (child.kind === "null" ? undefined : child.valid)
        : V.andValid(child.kind === "null" ? undefined : child.valid, v.valid, v.length)
      columns.push(new Column(f.name, V.withValid(child, valid), undefined))
    })
  }
  return make(columns, self.length)
}

/** @internal */
export const unpivot = (
  self: Frame,
  options: {
    readonly index: ReadonlyArray<string>
    readonly on: ReadonlyArray<string>
    readonly variable: string
    readonly value: string
  }
): Frame => {
  const n = self.length
  const k = options.on.length
  const repeat = new Int32Array(n * k)
  for (let b = 0; b < k; b++) for (let i = 0; i < n; i++) repeat[b * n + i] = i
  const keys = options.index.map((name) => {
    const c = column(self, name)
    return new Column(name, V.take(c.values(), repeat), undefined, c.nullable)
  })
  const parts = options.on.map((name) => column(self, name).values())
  const type = parts.reduce<S.DataType>((t, p) => {
    const st = D.supertype(t, undefined, p.type, undefined)
    return st === undefined ? V.fail(`cannot unpivot ${D.describe(t)} with ${D.describe(p.type)}`) : st.type
  }, parts.length === 0 ? S.nullType : parts[0].type)
  const variable = V.stringsFrom(S.utf8, options.on.flatMap((name) => Array.from({ length: n }, () => name)))
  const value = k === 0 ? V.nulls(0) : V.concat(parts.map((p) => K.cast(p, type)))
  return make(
    [...keys, new Column(options.variable, variable, undefined, false), new Column(options.value, value, undefined)],
    n * k
  )
}
