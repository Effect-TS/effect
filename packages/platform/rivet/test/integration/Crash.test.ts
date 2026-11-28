import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber } from "effect"
import { withCluster, wrote } from "../fixtures/harness.ts"
import { Ledger } from "../fixtures/Ledger.ts"

const holdMillis = 600_000

// The node that runs a request first is started with HOLD=1: its handler
// writes a row in `ledger_commits`, then waits, so the kill lands after the
// side effect and before the reply is saved. Handler commits are counted from
// that table, separately from the stored reply rows, so a deduplicated reply
// cannot hide a repeated side effect.
const cases = [
  {
    name: "replays once on the surviving node, a retry gets the stored reply",
    rpc: "Record" as const,
    op: "kill-record",
    twoNodes: true,
    commits: 2,
    commitNodes: (survivor: string) => ["node-a", survivor]
  },
  {
    name: "WithTransaction: the killed execution's write rolls back with its reply",
    rpc: "RecordTx" as const,
    op: "kill-tx",
    twoNodes: false,
    commits: 1,
    commitNodes: (survivor: string) => [survivor]
  }
] as const

describe("Rivet cluster integration | crash between commit and reply", () => {
  for (const testCase of cases) {
    it.live(
      testCase.name,
      () =>
        withCluster((cluster) =>
          Effect.gen(function*() {
            const nodeA = yield* cluster.startNode("node-a", { hold: true })
            const ledger = (yield* Ledger.client)(testCase.op)
            const first = yield* Effect.forkChild(
              Effect.exit(ledger[testCase.rpc]({ op: testCase.op, holdMillis }))
            )
            yield* cluster.waitForEvent("The first execution did not write", wrote(testCase.op, "node-a"))
            const survivor = testCase.twoNodes ? "node-b" : "node-a2"
            if (testCase.twoNodes) {
              yield* cluster.startNode(survivor)
            }
            yield* nodeA.signal("SIGKILL")
            if (!testCase.twoNodes) {
              yield* cluster.startNode(survivor)
            }

            yield* cluster.waitForEvent("The request was not replayed after the kill", wrote(testCase.op, survivor))

            // The caller retries the persisted request on `ups.consumer_closed`;
            // the mailbox dedupes it onto the stored row.
            const firstExit = yield* Fiber.join(first)
            const expected = { node: survivor, commits: testCase.commits }
            assert.deepStrictEqual(firstExit, Exit.succeed(expected))
            assert.deepStrictEqual(yield* ledger[testCase.rpc]({ op: testCase.op, holdMillis }), expected)

            const inspection = yield* ledger.Inspect({ op: testCase.op })
            assert.deepStrictEqual(inspection.commitNodes, testCase.commitNodes(survivor), "handler commits")
            assert.deepStrictEqual(inspection.replies, [expected], "stored replies")
            assert.strictEqual(inspection.unprocessed, 0)
          })
        ),
      300_000
    )
  }
})
