import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { withCluster } from "../fixtures/harness.ts"
import { Ledger } from "../fixtures/Ledger.ts"

const requests = 20

describe("Rivet cluster integration | WithTransaction with entity concurrency above 1", () => {
  it.live(
    "concurrent transactional requests on one actor each commit once with their reply",
    () =>
      withCluster((cluster) =>
        Effect.gen(function*() {
          yield* cluster.startNode("node-a")
          const ledger = (yield* Ledger.client)("concurrent")
          // The fixture registers Ledger with unbounded concurrency, so every
          // handler opens its transaction at once and Rivet queues them.
          const ops = Array.from({ length: requests }, (_, index) => `tx-${index}`)
          const results = yield* Effect.forEach(ops, (op) => ledger.RecordTx({ op, holdMillis: 0 }), {
            concurrency: "unbounded"
          })
          assert.deepStrictEqual(results, ops.map(() => ({ node: "node-a", commits: 1 })))

          yield* Effect.forEach(
            ops,
            Effect.fnUntraced(function*(op) {
              const inspection = yield* ledger.Inspect({ op })
              assert.deepStrictEqual(inspection.commitNodes, ["node-a"], `${op} handler commits`)
              assert.deepStrictEqual(inspection.replies, [{ node: "node-a", commits: 1 }], `${op} stored replies`)
            }),
            { concurrency: "unbounded" }
          )
        })
      ),
    300_000
  )
})
