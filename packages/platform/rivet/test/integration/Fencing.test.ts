import { assert, describe, it } from "@effect/vitest"
import { Effect, Schedule } from "effect"
import { withCluster, wrote } from "../fixtures/harness.ts"
import { Ledger } from "../fixtures/Ledger.ts"

// Long enough for the freeze to land mid-handler, short enough that the
// frozen handler continues right after SIGCONT.
const holdMillis = 3_000

describe("Rivet cluster integration | frozen node", () => {
  it.live(
    "a node frozen past the reschedule cannot commit after it resumes",
    () =>
      withCluster((cluster) =>
        Effect.gen(function*() {
          const nodeA = yield* cluster.startNode("node-a", { hold: true })
          const client = yield* Ledger.client
          const plain = client("freeze-plain")
          const tx = client("freeze-tx")
          // Tells, so no caller retry races the frozen node.
          yield* plain.Record({ op: "freeze-plain", holdMillis }, { discard: true })
          yield* tx.RecordTx({ op: "freeze-tx", holdMillis }, { discard: true })
          for (const op of ["freeze-plain", "freeze-tx"]) {
            yield* cluster.waitForEvent(`${op} did not run`, wrote(op, "node-a"))
          }
          yield* nodeA.signal("SIGSTOP")
          yield* cluster.startNode("node-b")

          // A request makes the gateway find the frozen node gone and reallocate
          // the actor. Retried, since the first calls may land mid-reallocation.
          yield* Effect.all([
            plain.Inspect({ op: "freeze-plain" }),
            tx.Inspect({ op: "freeze-tx" })
          ], { concurrency: "unbounded" }).pipe(
            Effect.timeout(60_000),
            Effect.retry({ schedule: Schedule.spaced(1_000), times: 30 })
          )
          for (const op of ["freeze-plain", "freeze-tx"]) {
            yield* cluster.waitForEvent(`${op} was not replayed on node-b`, wrote(op, "node-b"), 120_000)
          }
          // Let node-b finish both replays before the stale node resumes.
          yield* Effect.sleep(2_000)
          yield* nodeA.signal("SIGCONT")
          for (const op of ["freeze-plain", "freeze-tx"]) {
            yield* cluster.waitForEvent(
              `${op} did not resume on node-a`,
              (event) => event.event === "resumed" && event.op === op && event.node === "node-a",
              30_000
            )
          }
          yield* Effect.sleep(2_000)

          // The plain handler's first write committed before the freeze; nothing
          // node-a does after it resumes may land.
          const plainInspection = yield* plain.Inspect({ op: "freeze-plain" })
          assert.deepStrictEqual(plainInspection.commitNodes, ["node-a", "node-b"], "plain handler commits")
          assert.deepStrictEqual(plainInspection.replies, [], "a tell stores no reply")
          assert.strictEqual(plainInspection.unprocessed, 0)

          // The transactional handler was frozen inside its open transaction.
          const txInspection = yield* tx.Inspect({ op: "freeze-tx" })
          assert.deepStrictEqual(txInspection.commitNodes, ["node-b"], "transactional handler commits")
          assert.strictEqual(txInspection.unprocessed, 0)
        })
      ),
    400_000
  )
})
