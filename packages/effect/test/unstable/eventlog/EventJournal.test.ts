import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as EventJournal from "effect/unstable/eventlog/EventJournal"

describe("EventJournal", () => {
  it.effect("relays an imported entry to another remote", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeMemory
      const source = EventJournal.makeRemoteIdUnsafe()
      const target = EventJournal.makeRemoteIdUnsafe()
      yield* journal.nextRemoteSequence(target)
      const entry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array()
      }, { disableChecks: true })
      yield* journal.writeFromRemote({
        remoteId: source,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry })],
        effect: () => Effect.void
      })
      const missing = yield* journal.withRemoteUncommited(target, Effect.succeed)
      assert.deepStrictEqual(missing.map((item) => item.idString), [entry.idString])
      const sourceMissing = yield* journal.withRemoteUncommited(source, Effect.succeed)
      assert.deepStrictEqual(sourceMissing, [])
    }))

  it.effect("records entries in memory and publishes local changes", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.EventJournal
      let created = 0
      yield* journal.write({
        event: "test",
        primaryKey: "pk-1",
        payload: new Uint8Array([1, 2, 3]),
        effect: (entry) =>
          Effect.sync(() => {
            created = entry.createdAtMillis
          })
      })
      const entries = yield* journal.entries
      assert.strictEqual(entries.length, 1)
      assert.strictEqual(entries[0].event, "test")
      assert.strictEqual(entries[0].primaryKey, "pk-1")
      assert.strictEqual(entries[0].createdAtMillis, created)
    }).pipe(Effect.provide(EventJournal.layerMemory)))
})
