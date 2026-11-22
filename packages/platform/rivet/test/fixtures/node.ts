// A Rivet node process for the integration tests. Run with plain `node`.
//
// Env: NODE_NAME, RIVET_ENDPOINT, RIVET_TOKEN, EVENTS_FILE, HOLD ("1" makes a
// Record handler wait after its commit), FAIL_WAKE_FILE (when the file
// exists, the next actor wake deletes it and fails).
import * as RivetActors from "@effect/platform-rivet/RivetActors"
import * as RivetCluster from "@effect/platform-rivet/RivetCluster"
import { EntityDatabase } from "@effect/platform-rivet/RivetEntityDatabase"
import { Effect, Layer, Scope } from "effect"
import * as fs from "node:fs"
import { setup } from "rivetkit"
import { createClient } from "rivetkit/client"
import { Ledger } from "./Ledger.ts"

const node = process.env.NODE_NAME ?? "node"
const eventsFile = process.env.EVENTS_FILE!
const hold = process.env.HOLD === "1"
const failWakeFile = process.env.FAIL_WAKE_FILE

const record = (event: Record<string, unknown>) =>
  fs.appendFileSync(eventsFile, JSON.stringify({ ...event, node, at: Date.now() }) + "\n")

const recordOp =
  (event: string) => (request: { readonly payload: { readonly op: string; readonly holdMillis: number } }) =>
    Effect.gen(function*() {
      const db = yield* EntityDatabase.orDie
      const { holdMillis, op } = request.payload
      record({ event: "enter", rpc: event, op })
      yield* db.execute("INSERT INTO ledger_commits (op, node) VALUES (?, ?)", op, node)
      record({ event: "wrote", rpc: event, op })
      if (hold && holdMillis > 0) {
        yield* Effect.sleep(holdMillis)
        record({ event: "resumed", rpc: event, op })
      }
      const rows = yield* db.execute<{ readonly n: number }>(
        "SELECT COUNT(*) AS n FROM ledger_commits WHERE op = ?",
        op
      )
      return { node, commits: Number(rows[0].n) }
    })

const LedgerLayer = Ledger.toLayer(
  Effect.gen(function*() {
    const db = yield* EntityDatabase.orDie
    yield* db.execute("CREATE TABLE IF NOT EXISTS ledger_commits (op TEXT NOT NULL, node TEXT NOT NULL)")
    return Ledger.of({
      Record: recordOp("Record"),
      RecordTx: recordOp("RecordTx"),
      Inspect: Effect.fnUntraced(function*({ payload: { op } }) {
        const db = yield* EntityDatabase.orDie
        const commits = yield* db.execute<{ readonly node: string }>(
          "SELECT node FROM ledger_commits WHERE op = ? ORDER BY rowid",
          op
        )
        const replies = yield* db.execute<{ readonly reply: string }>(
          `SELECT r.reply FROM cluster_replies r
             JOIN cluster_messages m ON m.request_id = r.request_id
             WHERE m.message_id LIKE ?`,
          `%/${op}`
        )
        const pending = yield* db.execute<{ readonly n: number }>(
          "SELECT COUNT(*) AS n FROM cluster_messages WHERE processed = 0"
        )
        return {
          commitNodes: commits.map((row) => row.node),
          replies: replies.map((row) => {
            const exit = JSON.parse(row.reply).exit
            return exit._tag === "Success" ? exit.value : exit
          }),
          unprocessed: Number(pending[0].n)
        }
      })
    })
  }),
  { concurrency: "unbounded" }
)

const registry = setup({
  use: {
    clusterEntity: RivetActors.makeClusterEntity({
      onWake: async (key) => {
        record({ event: "wake", key })
        if (failWakeFile !== undefined && fs.existsSync(failWakeFile)) {
          fs.rmSync(failWakeFile)
          record({ event: "wake-failed", key })
          throw new Error("Injected onWake failure")
        }
      }
    })
  },
  noWelcome: true
})

const client = createClient<typeof registry>({
  endpoint: process.env.RIVET_ENDPOINT!,
  token: process.env.RIVET_TOKEN!
})

const scope = Effect.runSync(Scope.make())
await Effect.runPromise(
  Layer.buildWithScope(LedgerLayer.pipe(Layer.provide(RivetCluster.layer({ entities: [Ledger], client }))), scope)
)
await registry.startAndWait()
record({ event: "ready" })
console.log("READY")
