import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { withCluster, wrote } from "../fixtures/harness.ts"
import { Ledger } from "../fixtures/Ledger.ts"

describe("Rivet cluster integration | recovery without traffic", () => {
  it.live(
    "the drain schedule wakes the actor on a new node and replays the tell",
    () =>
      withCluster((cluster) =>
        Effect.gen(function*() {
          const nodeA = yield* cluster.startNode("node-a", { hold: true })
          const ledger = (yield* Ledger.client)("recovery")
          // A tell returns once the row is stored, so no caller is left waiting
          // to retry: only the actor's own schedule can bring it back.
          yield* ledger.Record({ op: "recovery", holdMillis: 600_000 }, { discard: true })
          yield* cluster.waitForEvent("The tell did not run", wrote("recovery", "node-a"))
          yield* nodeA.signal("SIGKILL")
          yield* cluster.startNode("node-a2")

          yield* cluster.waitForEvent(
            "The actor did not wake on the new node",
            (event) => event.event === "wake" && event.node === "node-a2",
            240_000
          )
          yield* cluster.waitForEvent("The tell was not replayed", wrote("recovery", "node-a2"), 60_000)

          // Only now does the test call the entity.
          const inspection = yield* ledger.Inspect({ op: "recovery" })
          assert.deepStrictEqual(inspection.commitNodes, ["node-a", "node-a2"], "handler commits")
          assert.deepStrictEqual(inspection.replies, [], "a tell stores no reply")
          assert.strictEqual(inspection.unprocessed, 0)
        })
      ),
    400_000
  )
})
