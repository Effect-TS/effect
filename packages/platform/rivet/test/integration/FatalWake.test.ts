import { assert, describe, it } from "@effect/vitest"
import { Effect, Schedule } from "effect"
import { withCluster, wrote } from "../fixtures/harness.ts"
import { Ledger } from "../fixtures/Ledger.ts"

describe("Rivet cluster integration | failed wake", () => {
  it.live(
    "an actor whose onWake failed wakes again without POST /actors/{id}/reschedule",
    () =>
      withCluster((cluster) =>
        Effect.gen(function*() {
          const nodeA = yield* cluster.startNode("node-a", { hold: true })
          const ledger = (yield* Ledger.client)("fatal")
          yield* ledger.Record({ op: "fatal", holdMillis: 600_000 }, { discard: true })
          yield* cluster.waitForEvent("The tell did not run", wrote("fatal", "node-a"))

          // The next wake, on the replacement node, fails in onWake.
          yield* cluster.failNextWake
          yield* nodeA.signal("SIGKILL")
          yield* cluster.startNode("node-a2")
          yield* cluster.waitForEvent(
            "The actor did not try to wake on node-a2",
            (event) => event.event === "wake-failed" && event.node === "node-a2",
            120_000
          )

          // Subsequent traffic wakes the actor again and drains the pending tell.
          const inspection = yield* ledger.Inspect({ op: "fatal" }).pipe(
            Effect.timeout(60_000),
            Effect.retry({ schedule: Schedule.spaced(2_000), times: 30 })
          )

          assert.deepStrictEqual(inspection.commitNodes, ["node-a", "node-a2"], "handler commits")
          assert.strictEqual(inspection.unprocessed, 0)
        })
      ),
    400_000
  )
})
