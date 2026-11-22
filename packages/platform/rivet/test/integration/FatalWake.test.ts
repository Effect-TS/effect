import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Schedule } from "effect"
import { withCluster } from "../fixtures/harness.ts"
import { Ledger } from "../fixtures/Ledger.ts"

// How long the test watches for a second wake with no traffic.
const quietMillis = 60_000

describe("Rivet cluster integration | failed wake", () => {
  it.live(
    "an actor whose onWake failed wakes again without POST /actors/{id}/reschedule",
    () =>
      withCluster((cluster) =>
        Effect.gen(function*() {
          const nodeA = yield* cluster.startNode("node-a", { hold: true })
          const ledger = (yield* Ledger.client)("fatal")
          yield* ledger.Record({ op: "fatal", holdMillis: 600_000 }, { discard: true })
          yield* cluster.waitForEvent(
            "The tell did not run",
            (event) => event.event === "wrote" && event.op === "fatal" && event.node === "node-a"
          )

          // The next wake, on the replacement node, fails in onWake.
          yield* cluster.failNextWake
          yield* nodeA.signal("SIGKILL")
          yield* cluster.startNode("node-a2")
          const failed = yield* cluster.waitForEvent(
            "The actor did not try to wake on node-a2",
            (event) => event.event === "wake-failed" && event.node === "node-a2",
            120_000
          )

          // Without traffic: does the engine or the schedule wake it again?
          yield* Effect.sleep(quietMillis)
          const quietWakes = cluster.events().filter((event) =>
            event.event === "wake" && event.node === "node-a2" && event.at > failed.at
          )
          console.log(`[rivet] wakes in ${quietMillis} ms after the failed wake, no traffic: ${quietWakes.length}`)

          // With traffic: the first call after the failure, then retries.
          const firstCall = yield* Effect.exit(ledger.Inspect({ op: "fatal" }).pipe(Effect.timeout(60_000)))
          console.log(
            `[rivet] first call after the failed wake: ${
              Exit.isSuccess(firstCall) ? "success" : Cause.pretty(firstCall.cause).split("\n")[0]
            }`
          )
          const inspection = yield* ledger.Inspect({ op: "fatal" }).pipe(
            Effect.timeout(60_000),
            Effect.retry({ schedule: Schedule.spaced(2_000), times: 30 })
          )
          const wakes = cluster.events().filter((event) => event.event === "wake" && event.node === "node-a2")
          console.log(`[rivet] wakes on node-a2: ${wakes.length}`)

          assert.deepStrictEqual(inspection.commitNodes, ["node-a", "node-a2"], "handler commits")
          assert.strictEqual(inspection.unprocessed, 0)
        })
      ),
    400_000
  )
})
