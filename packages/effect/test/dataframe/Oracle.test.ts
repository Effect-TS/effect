/**
 * Semantic oracle: every case of the gold corpus (hand-written specification
 * cases plus seeded random pipelines) turned into an effect/dataframe plan,
 * encoded to JSON and back, run as a query (so the optimiser rewrites it)
 * and compared with the result Python Polars produced for the same plan. See
 * test/fixtures/dataframe/generate_gold.py and test/dataframe/oracle.
 */
import { assert, describe, it } from "@effect/vitest"
import * as Compare from "./oracle/Compare.ts"
import * as Gold from "./oracle/Gold.ts"
import * as Plan from "./oracle/Plan.ts"

const check = (c: Gold.Case, inline: boolean) => () => {
  assert.strictEqual(Compare.diff(c.id, Plan.run(c, inline), c.expected), undefined)
}

describe("DataFrame oracle (Polars gold)", () => {
  // Specification cases carry their inputs inline (Values nodes, encoded as
  // Arrow IPC in the JSON plan); random pipelines read them from a catalog.
  describe("specification", () => {
    for (const c of Gold.spec().cases) it(`${c.id}: ${c.description}`, check(c, true))
  })
  describe("random pipelines", () => {
    for (const c of Gold.random().cases) it(c.id, check(c, false))
  })
  describe("extended (windows, reshaping, types)", () => {
    for (const c of Gold.extended().cases) it(`${c.id}: ${c.description}`, check(c, false))
  })
})
