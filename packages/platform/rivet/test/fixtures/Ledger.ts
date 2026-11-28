import { Schema } from "effect"
import { ClusterSchema, Entity } from "effect/cluster"
import { Rpc } from "effect/rpc"

const RecordPayload = {
  op: Schema.String,
  // How long the first execution waits after its commit, on a node started
  // with HOLD=1. Gives the test a known point to kill or freeze the node.
  holdMillis: Schema.Number
}

export const Outcome = Schema.Struct({
  node: Schema.String,
  commits: Schema.Number
})

export const Inspection = Schema.Struct({
  // One entry per committed handler write, in commit order.
  commitNodes: Schema.Array(Schema.String),
  // The stored reply rows for the request, each decoded to its success value.
  replies: Schema.Array(Schema.Unknown),
  unprocessed: Schema.Number
})

export const Ledger = Entity.make("Ledger", [
  // Commits its side effect in its own statement, before the reply is saved.
  Rpc.make("Record", { payload: RecordPayload, primaryKey: ({ op }) => op, success: Outcome }).annotate(
    ClusterSchema.Persisted,
    true
  ),
  // Writes its side effect in the transaction that also saves the reply.
  Rpc.make("RecordTx", { payload: RecordPayload, primaryKey: ({ op }) => op, success: Outcome })
    .annotate(ClusterSchema.Persisted, true)
    .annotate(ClusterSchema.WithTransaction, true),
  // Volatile read of the side-effect table and the mailbox.
  Rpc.make("Inspect", { payload: { op: Schema.String }, success: Inspection })
])
