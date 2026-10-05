import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as SqlEventJournal from "effect/eventlog/SqlEventJournal"
import { PgContainer } from "./utils.ts"

it.layer(PgContainer.layerClient, { timeout: "30 seconds" })("SqlEventJournal", (it) => {
  it.effect("writes and reads local and remote entries", () =>
    Effect.gen(function*() {
      const journal = yield* SqlEventJournal.make()
      yield* journal.write({
        event: "UserCreated",
        primaryKey: "user-1",
        payload: new Uint8Array([1]),
        effect: () => Effect.void
      })

      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const remoteEntry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "UserCreated",
        primaryKey: "user-2",
        payload: new Uint8Array([2])
      }, { disableChecks: true })
      yield* journal.writeFromRemote({
        remoteId,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: remoteEntry })],
        effect: () => Effect.void
      })

      const entries = yield* journal.entries
      assert.deepStrictEqual(entries.map((entry) => entry.primaryKey), ["user-1", "user-2"])
      assert.strictEqual(entries[1].idString, remoteEntry.idString)
      assert.deepStrictEqual(entries[1].payload, new Uint8Array([2]))
      assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 1)
    }))
})
