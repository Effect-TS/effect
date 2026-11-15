/**
 * Differential tests on inputs large enough to reach the code paths the gold
 * corpus (small tables) can't: radix sorting, hash table growth and joins
 * with many keys. Each operation is compared with a plain row-by-row
 * reference implementation of the same (Polars) semantics.
 */
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { ArrowSchema, ArrowTable } from "effect/arrow"
import { DataFrame, Expr, Query } from "effect/dataframe"
import * as Result from "effect/Result"

type Row = {
  readonly f: number | null
  readonly i: number | null
  readonly b: bigint | null
  readonly s: string | null
  readonly p: boolean | null
}

const schema = ArrowSchema.make([
  ArrowSchema.field("f", ArrowSchema.float64),
  ArrowSchema.field("i", ArrowSchema.int32),
  ArrowSchema.field("b", ArrowSchema.int64),
  ArrowSchema.field("s", ArrowSchema.utf8),
  ArrowSchema.field("p", ArrowSchema.bool)
])

const strings = ["a", "b", "ab", "B", "é", "😀", "￿", "", "zz", "a\u0000"]

const generate = (seed: number, n: number, cardinality: number): Array<Row> => {
  let state = seed
  const next = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
  const pick = <A>(values: ReadonlyArray<A>) => values[Math.floor(next() * values.length)]
  const maybe = <A>(a: A): A | null => (next() < 0.1 ? null : a)
  return Array.from({ length: n }, () => ({
    f: maybe(pick([NaN, -0, 0, Infinity, -Infinity, Math.floor(next() * cardinality) - cardinality / 2, 0.5, -2.5])),
    i: maybe(Math.floor(next() * cardinality) - Math.floor(cardinality / 2)),
    b: maybe(BigInt(Math.floor(next() * cardinality)) * 4294967311n - 2n ** 40n),
    s: maybe(`${pick(strings)}${Math.floor(next() * cardinality)}`),
    p: maybe(next() < 0.5)
  }))
}

const frameOf = (rows: ReadonlyArray<Row>): DataFrame.DataFrame<Row> =>
  DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromRows(schema, rows as any))) as any

const rowsOf = <R>(query: Query.Query<R>): Array<R> => DataFrame.toRows(Effect.runSync(query))

// -----------------------------------------------------------------------------
// Reference semantics
// -----------------------------------------------------------------------------

const compareCodePoints = (a: string, b: string): number => {
  const x = Array.from(a, (c) => c.codePointAt(0)!)
  const y = Array.from(b, (c) => c.codePointAt(0)!)
  for (let k = 0; k < Math.min(x.length, y.length); k++) if (x[k] !== y[k]) return x[k] - y[k]
  return x.length - y.length
}

const compareValues = (a: unknown, b: unknown): number => {
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) ? (Number.isNaN(b) ? 0 : 1) : -1
    return a < b ? -1 : a > b ? 1 : 0
  }
  if (typeof a === "string") return compareCodePoints(a, b as string)
  if (typeof a === "boolean") return Number(a) - Number(b)
  return (a as bigint) < (b as bigint) ? -1 : (a as bigint) > (b as bigint) ? 1 : 0
}

const referenceSort = (
  rows: ReadonlyArray<Row>,
  keys: ReadonlyArray<{ readonly name: keyof Row; readonly descending: boolean }>,
  nullsLast: boolean
): Array<Row> =>
  [...rows].sort((r1, r2) => {
    for (const { descending, name } of keys) {
      const a = r1[name]
      const b = r2[name]
      if (a === null || b === null) {
        if (a === b) continue
        return (a === null ? -1 : 1) * (nullsLast ? -1 : 1)
      }
      const c = compareValues(a, b) * (descending ? -1 : 1)
      if (c !== 0) return c
    }
    return 0
  })

const keyOf = (values: ReadonlyArray<unknown>) =>
  JSON.stringify(
    values,
    (_, v) =>
      typeof v === "bigint" ? `${v}n` : typeof v === "number" && !Number.isFinite(v) ? String(v) : v === 0 ? 0 : v
  )

const referenceGroups = (rows: ReadonlyArray<Row>, keys: ReadonlyArray<keyof Row>) => {
  const groups = new Map<string, Array<Row>>()
  for (const r of rows) {
    const k = keyOf(keys.map((name) => r[name]))
    const g = groups.get(k)
    if (g === undefined) groups.set(k, [r])
    else g.push(r)
  }
  return [...groups.values()]
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

const rows = generate(0x2545f491, 6000, 3000)
const df = Query.from(frameOf(rows))

describe("DataFrame at scale (differential)", () => {
  for (const name of ["f", "i", "b", "s", "p"] as const) {
    for (const descending of [false, true]) {
      for (const nullsLast of [false, true]) {
        it(`sort by ${name} ${descending ? "desc" : "asc"} nulls ${nullsLast ? "last" : "first"}`, () => {
          const key = Expr.fromPlan({ _tag: "Column", name })
          const sorted = Query.sort(df, () => [descending ? Expr.desc(key) : Expr.asc(key)], { nullsLast })
          assert.deepStrictEqual(rowsOf(sorted), referenceSort(rows, [{ name, descending }], nullsLast))
        })
      }
    }
  }

  it("multi-key sort is stable", () => {
    const keys = [{ name: "p", descending: true }, { name: "s", descending: false }, {
      name: "f",
      descending: true
    }] as const
    const sorted = Query.sort(df, (c) => [Expr.desc(c.p), Expr.asc(c.s), Expr.desc(c.f)])
    assert.deepStrictEqual(rowsOf(sorted), referenceSort(rows, keys, false))
  })

  // A slice of a sort runs as a top-k selection.
  for (
    const [name, descending, nullsLast, offset, length] of [
      ["f", true, false, 0, 10],
      ["i", false, true, 0, 1],
      ["s", false, false, 5, 20],
      ["b", true, true, 0, 700],
      ["p", false, false, 0, 50]
    ] as const
  ) {
    it(`sort by ${name} then slice ${offset}+${length} keeps the sorted rows`, () => {
      const top = df.pipe(
        Query.sort((c) => {
          const key: Expr.Expr<unknown> = c[name]
          return [descending ? Expr.desc(key) : Expr.asc(key), Expr.asc(c.i)]
        }, { nullsLast }),
        Query.slice(offset, length)
      )
      const keys = [{ name, descending }, { name: "i", descending: false }] as const
      assert.deepStrictEqual(rowsOf(top), referenceSort(rows, keys, nullsLast).slice(offset, offset + length))
    })
  }

  for (const keys of [["i"], ["s"], ["b"], ["f"], ["p", "i"], ["s", "b", "p"]] as const) {
    it(`groupBy ${keys.join(", ")}`, () => {
      const result = df.pipe(
        Query.groupBy(...keys),
        Query.agg((c) => ({ n: Expr.count(), ni: Expr.count(c.i), max: Expr.max(c.s), first: Expr.first(c.b) }))
      )
      const expected = referenceGroups(rows, keys).map((g) => {
        const out: Record<string, unknown> = {}
        for (const k of keys) out[k] = g[0][k]
        const present = g.map((r) => r.s).filter((s): s is string => s !== null)
        out.n = g.length
        out.ni = g.filter((r) => r.i !== null).length
        out.max = present.length === 0 ? null : present.reduce((a, b) => (compareCodePoints(a, b) >= 0 ? a : b))
        out.first = g[0].b
        return out
      })
      assert.deepStrictEqual(rowsOf(result), expected)
    })
  }

  it("unique keeps the first row per key", () => {
    const result = Query.unique(df, ["i", "p"])
    assert.deepStrictEqual(rowsOf(result), referenceGroups(rows, ["i", "p"]).map((g) => g[0]))
  })

  for (const how of ["inner", "left", "semi", "anti"] as const) {
    it(`${how} join on a high-cardinality key`, () => {
      const right = generate(0x1b873593, 4000, 3000).map((r) => ({ i: r.i, rs: r.s }))
      const rightFrame = DataFrame.fromColumns({
        i: Int32Array.from(right, (r) => r.i ?? 0),
        rs: right.map((r) => r.rs)
      })
      const result = Query.join(df.pipe(Query.pick("i", "s")), Query.from(rightFrame), { on: "i", how })
      const byKey = new Map<number, Array<string | null>>()
      for (const r of right) {
        const k = r.i ?? 0
        byKey.set(k, [...(byKey.get(k) ?? []), r.rs])
      }
      const expected = rows.flatMap((r) => {
        const matches = r.i === null ? [] : byKey.get(r.i) ?? []
        switch (how) {
          case "inner":
            return matches.map((rs) => ({ i: r.i, s: r.s, rs }))
          case "left":
            return matches.length === 0 ? [{ i: r.i, s: r.s, rs: null }] : matches.map((rs) => ({ i: r.i, s: r.s, rs }))
          case "semi":
            return matches.length > 0 ? [{ i: r.i, s: r.s }] : []
          case "anti":
            return matches.length === 0 ? [{ i: r.i, s: r.s }] : []
        }
      })
      assert.deepStrictEqual(rowsOf(result), expected)
    })
  }

  it("filters compose with later column reads", () => {
    const result = df.pipe(
      Query.filter((c) => Expr.isNotNull(c.i)),
      Query.sort((c) => [c.i]),
      Query.filter((c) => Expr.gt(c.i, 0)),
      Query.head(100)
    )
    const expected = referenceSort(rows.filter((r) => r.i !== null), [{ name: "i", descending: false }], false)
      .filter((r) => (r.i as number) > 0)
      .slice(0, 100)
    assert.deepStrictEqual(rowsOf(result), expected)
  })
})
