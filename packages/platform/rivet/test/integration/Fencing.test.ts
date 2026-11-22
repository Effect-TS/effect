import { assert, describe, it } from "@effect/vitest"
import { Effect, Schedule } from "effect"
import { withCluster } from "../fixtures/harness.ts"
import { Ledger } from "../fixtures/Ledger.ts"

// Long enough for the freeze to land mid-handler, short enough that the
// frozen handler continues right after SIGCONT.
const holdMillis = 3_000

// How long the test waits after the freeze with no traffic before it starts
// calling the entities. Longer than the engine's 15 s ping timeout plus the
// suite's 5 s node-lost threshold.
const quietMillis = 60_000

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
            yield* cluster.waitForEvent(
              `${op} did not run`,
              (event) => event.event === "wrote" && event.op === op && event.node === "node-a"
            )
          }
          yield* nodeA.signal("SIGSTOP")
          const frozenAt = Date.now()
          yield* cluster.startNode("node-b")

          // Without traffic the actors stay on the frozen node: the engine checks
          // a node only when the actor's alarm fires or a request fails to reach
          // it, and the drain schedule is re-armed by the frozen node itself.
          yield* Effect.sleep(quietMillis)
          const quietReplays = cluster.events().filter((event) => event.event === "wrote" && event.node === "node-b")
          console.log(
            `[rivet] replays on node-b ${quietMillis} ms after the freeze, no traffic: ${quietReplays.length}`
          )

          // A request makes the gateway find the frozen node gone and reallocate
          // the actor. Retried, since the first calls may land mid-reallocation.
          const trafficAt = Date.now()
          yield* Effect.all([
            plain.Inspect({ op: "freeze-plain" }),
            tx.Inspect({ op: "freeze-tx" })
          ], { concurrency: "unbounded" }).pipe(
            Effect.timeout(60_000),
            Effect.retry({ schedule: Schedule.spaced(1_000), times: 10 })
          )
          for (const op of ["freeze-plain", "freeze-tx"]) {
            const replay = yield* cluster.waitForEvent(
              `${op} was not replayed on node-b`,
              (event) => event.event === "wrote" && event.op === op && event.node === "node-b",
              120_000
            )
            console.log(
              `[rivet] ${op}: freeze to replay write ${replay.at - frozenAt} ms, first request to replay write ${
                replay.at - trafficAt
              } ms`
            )
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
          yield* Effect.sleep(5_000)
          console.log(
            `[rivet] node-a after SIGCONT:\n${
              nodeA.log().split("\n").filter((line) => /error|warn|fenc|epoch|closed/i.test(line)).slice(0, 20).join(
                "\n"
              )
            }`
          )

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
