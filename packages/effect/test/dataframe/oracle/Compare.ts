/**
 * Compares a DataFrame with a gold (Polars) result: column names, column
 * types and values, in row order.
 *
 * Floats compare with a relative tolerance of 1e-9 (summation order differs
 * from Polars), NaN equals NaN, and -0 equals 0.
 */
import { BigDecimal, Effect } from "effect"
import { DataFrame, Expr, Query } from "effect/dataframe"
import * as Gold from "./Gold.ts"
import * as Plan from "./Plan.ts"

/**
 * Deliberate differences from Polars, by case id: the column types
 * effect/dataframe produces instead. Values still have to match.
 */
export const deviations: {
  readonly [id: string]: { readonly reason: string; readonly types: { readonly [column: string]: string } }
} = {
  "group/small-ints": {
    reason: "sums of 8/16-bit integers are Int32 (Polars: Int64, which would be a bigint in TypeScript)",
    types: { i8: "i32", u8: "i32" }
  }
}

const close = (a: number, b: number): boolean => {
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) && Number.isNaN(b)
  if (a === b) return true
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b)) + 1e-300
}

const same = (actual: unknown, expected: unknown): boolean => {
  if (actual === null || expected === null) return actual === expected
  if (BigDecimal.isBigDecimal(expected)) return BigDecimal.isBigDecimal(actual) && BigDecimal.equals(actual, expected)
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length && actual.every((a, i) => same(a, expected[i]))
  }
  if (typeof expected === "object" && typeof actual === "object") {
    const keys = Object.keys(expected)
    return keys.length === Object.keys(actual).length &&
      keys.every((k) => same((actual as any)[k] ?? null, (expected as any)[k]))
  }
  if (typeof actual === "number" && typeof expected === "number") return close(actual, expected)
  if (typeof actual === "bigint" || typeof expected === "bigint") {
    return typeof actual === typeof expected ? actual === expected : Number(actual) === Number(expected)
  }
  return actual === expected
}

const show = (u: unknown): string =>
  BigDecimal.isBigDecimal(u)
    ? `${BigDecimal.format(u)}d`
    : typeof u === "bigint"
    ? `${u}n`
    : typeof u === "number"
    ? (Object.is(u, -0) ? "-0" : String(u))
    : JSON.stringify(u) ?? String(u)

/** `undefined` when equal, otherwise a description of the first difference. */
export const diff = (id: string, actual: DataFrame.DataFrame<any>, expected: Gold.Table): string | undefined => {
  const names = actual.schema.fields.map((f) => f.name)
  const expectedNames = expected.fields.map((f) => f.name)
  if (JSON.stringify(names) !== JSON.stringify(expectedNames)) {
    return `columns: got ${JSON.stringify(names)}, expected ${JSON.stringify(expectedNames)}`
  }
  const deviation = deviations[id]
  for (const [i, f] of expected.fields.entries()) {
    const got = Plan.typeName(actual.schema.fields[i].type)
    const want = deviation?.types[f.name] ?? f.type
    if (got !== want) return `column ${f.name}: type ${got}, expected ${want}`
  }
  const length = expected.fields.length === 0 ? 0 : expected.columns[expected.fields[0].name].length
  if (actual.length !== length) return `length ${actual.length}, expected ${length}`
  // Temporal columns compare through their integers (days or units since the epoch).
  const rows = DataFrame.toRows(Effect.runSync(
    Query.from(actual).pipe(Query.select((c: any) => {
      const out: Record<string, Expr.Expr<unknown>> = {}
      for (const f of expected.fields) {
        const t = Plan.temporal[f.type]
        out[f.name] = t === undefined ? c[f.name] : Expr.cast(c[f.name], t.storage)
      }
      return out
    }))
  ))
  for (const f of expected.fields) {
    const column = expected.columns[f.name]
    for (let i = 0; i < length; i++) {
      const want = Gold.decodeValue(column[i], f.type)
      const got = rows[i][f.name]
      if (!same(got, want)) return `column ${f.name}, row ${i}: got ${show(got)}, expected ${show(want)}`
    }
  }
  return undefined
}
