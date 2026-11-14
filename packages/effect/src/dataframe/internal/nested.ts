/**
 * Lists and structs: element access and aggregates of list columns, struct
 * fields and construction (Polars semantics).
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as Agg from "./aggregate.ts"
import * as D from "./dtype.ts"
import * as K from "./kernels.ts"
import * as V from "./vector.ts"

const asList = (v: V.Vector, fn: string): V.List =>
  v.kind === "list" ? v : V.fail(`${fn} is defined for lists, not ${D.describe(v.type)}`)

/** The row of every element of a list column. */
const elementRows = (v: V.List): Int32Array => {
  const ids = new Int32Array(v.child.length)
  for (let i = 0; i < v.length; i++) for (let e = v.offsets[i]; e < v.offsets[i + 1]; e++) ids[e] = i
  return ids
}

/** Number of elements; null for a null list. @internal */
export const length = (x: V.Vector): V.Vector => {
  const v = asList(x, "listLength")
  const out = new Float64Array(v.length)
  for (let i = 0; i < v.length; i++) out[i] = v.offsets[i + 1] - v.offsets[i]
  return V.f64(S.uint32, out, v.valid)
}

/** The element at `index` (negative counts from the end); null when out of range. @internal */
export const get = (x: V.Vector, index: number): V.Vector => {
  const v = asList(x, "listGet")
  const idx = new Int32Array(v.length)
  for (let i = 0; i < v.length; i++) {
    const start = v.offsets[i]
    const end = v.offsets[i + 1]
    const at = index < 0 ? end + index : start + index
    idx[i] = V.isValid(v, i) && at >= start && at < end ? at : -1
  }
  return V.take(v.child, idx)
}

/** An aggregate of every list's elements; null for a null list. @internal */
export const aggregate = (fn: "sum" | "mean" | "min" | "max", x: V.Vector): V.Vector => {
  const v = asList(x, `list${fn[0].toUpperCase()}${fn.slice(1)}`)
  const result = Agg.aggregate(fn, v.child, { ids: elementRows(v), count: v.length })
  return v.valid === undefined ? result : V.withValid(result, V.andValid(result.valid, v.valid, v.length))
}

/** Whether a list holds `item`; null for a null list. @internal */
export const contains = (x: V.Vector, item: K.Value): V.Vector => {
  const v = asList(x, "listContains")
  const n = v.length
  const items = V.take(K.materialize(item, n), elementRows(v))
  const eq = K.materialize(K.compare("eq", K.column(v.child), K.column(items), v.child.length), v.child.length)
  const out = new Uint8Array(n)
  if (eq.kind === "bool") {
    for (let i = 0; i < n; i++) {
      for (let e = v.offsets[i]; e < v.offsets[i + 1]; e++) {
        if (V.isValid(eq, e) && eq.values[e] === 1) {
          out[i] = 1
          break
        }
      }
    }
  }
  return V.bool(out, v.valid)
}

/** A struct field; null where the struct is null. @internal */
export const field = (x: V.Vector, name: string): V.Vector => {
  if (x.kind !== "struct") return V.fail(`field is defined for structs, not ${D.describe(x.type)}`)
  const fields = (x.type as S.Struct).fields
  const k = fields.findIndex((f) => f.name === name)
  if (k < 0) return V.fail(`struct has no field ${JSON.stringify(name)}`)
  const child = x.children[k]
  return x.valid === undefined
    ? child
    : V.withValid(child, V.andValid(child.kind === "null" ? undefined : child.valid, x.valid, x.length))
}

/** A struct of the given columns. @internal */
export const struct = (names: ReadonlyArray<string>, values: ReadonlyArray<V.Vector>, n: number): V.Vector =>
  V.struct(S.struct(values.map((v, k) => S.field(names[k], v.type))), values, n)
