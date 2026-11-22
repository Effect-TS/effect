import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber } from "effect"
import { type Cluster, withCluster } from "../fixtures/harness.ts"
import { Ledger } from "../fixtures/Ledger.ts"

const holdMillis = 600_000

// The node that runs a request first is started with HOLD=1: its handler
// writes a row in `ledger_commits`, then waits, so the kill lands after the
// side effect and before the reply is saved. Handler commits are counted from
// that table, separately from the stored reply rows, so a deduplicated reply
// cannot hide a repeated side effect.
const crashBetweenCommitAndReply = Effect.fnUntraced(function*(
  cluster: Cluster,
  options: { readonly rpc: "Record" | "RecordTx"; readonly op: string; readonly twoNodes: boolean }
) {
  const nodeA = yield* cluster.startNode("node-a", { hold: true })
  const ledger = (yield* Ledger.client)(options.op)
  const first = yield* Effect.forkChild(Effect.exit(ledger[options.rpc]({ op: options.op, holdMillis })))
  yield* cluster.waitForEvent(
    "The first execution did not write",
    (event) => event.event === "wrote" && event.op === options.op && event.node === "node-a"
  )
  // With two nodes the survivor is already connected when node-a dies.
  const survivor = options.twoNodes ? "node-b" : "node-a2"
  if (options.twoNodes) {
    yield* cluster.startNode(survivor)
  }
  yield* nodeA.signal("SIGKILL")
  const killedAt = Date.now()
  if (!options.twoNodes) {
    yield* cluster.startNode(survivor)
  }

  const replay = yield* cluster.waitForEvent(
    "The request was not replayed after the kill",
    (event) => event.event === "wrote" && event.op === options.op && event.node === survivor
  )
  console.log(`[rivet] ${options.op}: kill to replay write ${replay.at - killedAt} ms`)

  // The caller retries the persisted request on `ups.consumer_closed`; the
  // mailbox dedupes it onto the stored row.
  const firstExit = yield* Fiber.join(first)
  console.log(
    `[rivet] ${options.op}: first caller ${
      Exit.isSuccess(firstExit) ? JSON.stringify(firstExit.value) : String(firstExit.cause)
    }`
  )
  return { firstExit, survivor, ledger }
})

describe("Rivet cluster integration | crash between commit and reply", () => {
  it.live(
    "one node: replays once on the restarted node, a retry gets the stored reply",
    () =>
      withCluster((cluster) =>
        Effect.gen(function*() {
          const { firstExit, ledger, survivor } = yield* crashBetweenCommitAndReply(cluster, {
            rpc: "Record",
            op: "kill-one",
            twoNodes: false
          })
          const expected = { node: survivor, commits: 2 }
          assert.deepStrictEqual(firstExit, Exit.succeed(expected))
          assert.deepStrictEqual(yield* ledger.Record({ op: "kill-one", holdMillis }), expected)

          const inspection = yield* ledger.Inspect({ op: "kill-one" })
          // The side effect ran twice: once before the kill, once in the replay.
          assert.deepStrictEqual(inspection.commitNodes, ["node-a", survivor], "handler commits")
          assert.deepStrictEqual(inspection.replies, [expected], "stored replies")
          assert.strictEqual(inspection.unprocessed, 0)
        })
      ),
    300_000
  )

  it.live(
    "two nodes: replays once on the surviving node, a retry gets the stored reply",
    () =>
      withCluster((cluster) =>
        Effect.gen(function*() {
          const { firstExit, ledger, survivor } = yield* crashBetweenCommitAndReply(cluster, {
            rpc: "Record",
            op: "kill-two",
            twoNodes: true
          })
          const expected = { node: survivor, commits: 2 }
          assert.deepStrictEqual(firstExit, Exit.succeed(expected))
          assert.deepStrictEqual(yield* ledger.Record({ op: "kill-two", holdMillis }), expected)

          const inspection = yield* ledger.Inspect({ op: "kill-two" })
          assert.deepStrictEqual(inspection.commitNodes, ["node-a", survivor], "handler commits")
          assert.deepStrictEqual(inspection.replies, [expected], "stored replies")
          assert.strictEqual(inspection.unprocessed, 0)
        })
      ),
    300_000
  )

  it.live(
    "WithTransaction: the killed execution's write rolls back with its reply",
    () =>
      withCluster((cluster) =>
        Effect.gen(function*() {
          const { firstExit, ledger, survivor } = yield* crashBetweenCommitAndReply(cluster, {
            rpc: "RecordTx",
            op: "kill-tx",
            twoNodes: false
          })
          const expected = { node: survivor, commits: 1 }
          assert.deepStrictEqual(firstExit, Exit.succeed(expected))
          assert.deepStrictEqual(yield* ledger.RecordTx({ op: "kill-tx", holdMillis }), expected)

          const inspection = yield* ledger.Inspect({ op: "kill-tx" })
          assert.deepStrictEqual(inspection.commitNodes, [survivor], "handler commits")
          assert.deepStrictEqual(inspection.replies, [expected], "stored replies")
          assert.strictEqual(inspection.unprocessed, 0)
        })
      ),
    300_000
  )
})
