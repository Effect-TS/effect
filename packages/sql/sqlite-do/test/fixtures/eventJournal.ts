import type { DurableObjectNamespace, DurableObjectState } from "@cloudflare/workers-types"
import * as SqliteClient from "@effect/sql-sqlite-do/SqliteClient"
import { Array as Arr, Cause, Effect, Exit } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as SqlEventJournal from "effect/eventlog/SqlEventJournal"
import * as SqlClient from "effect/sql/SqlClient"

export class JournalObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request) {
    const layer = SqliteClient.layer({ storage: this.state.storage })
    if (new URL(request.url).pathname === "/batch") {
      return Response.json(await Effect.runPromise(batch.pipe(Effect.scoped, Effect.provide(layer))))
    }
    const program = Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const journal = yield* SqlEventJournal.make()
      // Saturated `rand_a` bits at the maximum timestamp leave no later local id.
      const id = EventJournal.makeEntryIdUnsafe({ msecs: 2 ** 48 - 1 })
      id[6] = 0x7f
      id[7] = 0xff
      const remote = new EventJournal.Entry({ id, event: "Repro", primaryKey: "key", payload: new Uint8Array() }, {
        disableChecks: true
      })
      // The import itself succeeds; the transaction around it then fails.
      const rolledBack = yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: remote })],
        effect: () => Effect.void
      }).pipe(Effect.andThen(Effect.fail("rolled back")), sql.withTransaction, Effect.exit)
      const written = yield* Effect.exit(journal.write({
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array(),
        effect: Effect.succeed
      }))
      return {
        rolledBack: rolledBack._tag,
        written: written._tag === "Success" ? [written.value.idString] : written._tag,
        entries: (yield* journal.entries).map((entry) => entry.idString)
      }
    }).pipe(Effect.scoped, Effect.provide(layer))
    return Response.json(await Effect.runPromise(program))
  }
}

// Durable Object SQLite binds at most 100 parameters per statement.
const batchCount = 101

const outcome = <A, E>(exit: Exit.Exit<A, E>) => Exit.isSuccess(exit) ? "Success" : Cause.pretty(exit.cause)

// Imports and writes batches that exceed the parameter limit in every
// per-entry statement.
const batch = Effect.gen(function*() {
  const journal = yield* SqlEventJournal.make()
  const remoteId = EventJournal.makeRemoteIdUnsafe()
  const imported = yield* Effect.exit(journal.writeFromRemote({
    remoteId,
    entries: Arr.makeBy(batchCount, (i) =>
      new EventJournal.RemoteEntry({
        remoteSequence: i,
        entry: new EventJournal.Entry({
          id: EventJournal.makeEntryIdUnsafe({ msecs: 1_000 + i }),
          event: "Repro",
          primaryKey: `remote-${i}`,
          payload: new Uint8Array()
        }, { disableChecks: true })
      })),
    effect: () => Effect.void
  }))
  const written = yield* Effect.exit(journal.writeMany({
    entries: Arr.makeBy(batchCount, (i) => ({ event: "Repro", primaryKey: `local-${i}`, payload: new Uint8Array() })),
    effect: Effect.succeed
  }))
  return {
    imported: outcome(imported),
    written: outcome(written),
    entries: (yield* journal.entries).length,
    nextSequence: yield* journal.nextRemoteSequence(remoteId)
  }
})

export default {
  fetch(request: Request, env: { JOURNAL: DurableObjectNamespace }) {
    return env.JOURNAL.get(env.JOURNAL.idFromName("journal")).fetch(request.url)
  }
}
