import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as SqlEventJournal from "effect/eventlog/SqlEventJournal"
import { PgContainer } from "./utils.ts"

it.layer(PgContainer.layerClient, { timeout: "30 seconds" })("SqlEventJournal", (it) => {
  it.effect("round-trips a local entry", () =>
    Effect.gen(function*() {
      const journal = yield* SqlEventJournal.make({
        entryTable: "local_entries",
        remotesTable: "local_remotes"
      })
      const written = yield* journal.write({
        event: "UserCreated",
        primaryKey: "user-1",
        payload: new Uint8Array([1]),
        effect: (entry) => Effect.succeed(entry)
      })
      const entries = yield* journal.entries
      assert.strictEqual(entries.length, 1)
      assert.strictEqual(entries[0].idString, written.idString)
      assert.strictEqual(entries[0].event, "UserCreated")
      assert.strictEqual(entries[0].primaryKey, "user-1")
      assert.deepStrictEqual(entries[0].payload, new Uint8Array([1]))
      assert.strictEqual(entries[0].createdAtMillis, written.createdAtMillis)
    }))

  it.effect("round-trips a remote entry and advances its sequence", () =>
    Effect.gen(function*() {
      const journal = yield* SqlEventJournal.make({
        entryTable: "remote_entries",
        remotesTable: "remote_remotes"
      })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const remoteEntry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe({ msecs: 1_700_000_000_000 }),
        event: "UserCreated",
        primaryKey: "user-2",
        payload: new Uint8Array([2])
      }, { disableChecks: true })
      assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 0)
      yield* journal.writeFromRemote({
        remoteId,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: remoteEntry })],
        effect: () => Effect.void
      })

      const entries = yield* journal.entries
      assert.strictEqual(entries.length, 1)
      assert.strictEqual(entries[0].idString, remoteEntry.idString)
      assert.strictEqual(entries[0].event, "UserCreated")
      assert.strictEqual(entries[0].primaryKey, "user-2")
      assert.deepStrictEqual(entries[0].payload, new Uint8Array([2]))
      assert.strictEqual(entries[0].createdAtMillis, 1_700_000_000_000)
      assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 1)
    }))
})
