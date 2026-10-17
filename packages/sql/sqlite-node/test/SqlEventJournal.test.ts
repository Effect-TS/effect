import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, FileSystem, Layer, Option, Queue, Schema } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogRemote from "effect/eventlog/EventLogRemote"
import * as SqlEventJournal from "effect/eventlog/SqlEventJournal"
import { Reactivity } from "effect/reactivity"
import * as SqlClient from "effect/sql/SqlClient"

const makeJournal = Effect.gen(function*() {
  const sql = yield* SqliteClient.make({ filename: ":memory:" })
  return yield* SqlEventJournal.make().pipe(
    Effect.provideService(SqlClient.SqlClient, sql)
  )
}).pipe(Effect.provide(Reactivity.layer))

describe("SqlEventJournal", () => {
  it.effect("replay invalidation observes committed entries from another connection", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const filename = directory + "/journal.db"
      const writer = yield* SqliteClient.make({ filename })
      const journal = yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, writer))
      const reader = yield* SqliteClient.make({ filename, readonly: true })
      // A separate connection cannot see the replay transaction's uncommitted rows.
      const readJournal = yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, reader))
      const group = EventGroup.empty.add({
        tag: "UserCreated",
        primaryKey: (payload) => payload.id,
        payload: Schema.Struct({ id: Schema.String })
      })
      const handlers = EventLog.group(group, (handlers) => handlers.handle("UserCreated", () => Effect.void)).pipe(
        Layer.merge(EventLog.groupReactivity(group, ["users"])),
        Layer.provide(EventLog.layerRegistry)
      )
      const layer = EventLog.layer(EventLog.schema(group), handlers).pipe(
        Layer.provide(Layer.succeed(EventJournal.EventJournal, journal)),
        Layer.provide(
          Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(
            Layer.provide(EventLogEncryption.layerSubtle)
          )
        )
      )
      const reactivity = yield* Reactivity.Reactivity
      const results = yield* reactivity.query(["users"], readJournal.entries)
      assert.deepStrictEqual(yield* Queue.take(results), [])
      const entry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "UserCreated",
        primaryKey: "user-1",
        payload: yield* Schema.encodeUnknownEffect(group.events.UserCreated.payloadSchemaBinary)({ id: "user-1" })
      }, { disableChecks: true })
      const changes = yield* Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>()
      yield* Queue.offer(changes, new EventJournal.RemoteEntry({ remoteSequence: 0, entry }))
      yield* Effect.gen(function*() {
        const registry = yield* EventLog.Registry
        yield* registry.registerRemote(EventLogRemote.EventLogRemote.of({
          id: EventJournal.makeRemoteIdUnsafe(),
          changes: () => Effect.succeed(changes),
          write: () => Effect.void,
          whenAuthenticated: (effect) => effect
        }))
        assert.deepStrictEqual((yield* Queue.take(results)).map((entry) => entry.idString), [entry.idString])
      }).pipe(Effect.provide(layer))
    }).pipe(Effect.provide([NodeFileSystem.layer, Reactivity.layer])))

  for (const [name, make] of [["SQL", makeJournal], ["memory", EventJournal.makeMemory]] as const) {
    describe(name, () => {
      it.effect("remote conflicts include only previously stored newer entries", () =>
        Effect.gen(function*() {
          const journal = yield* make
          const newer = new EventJournal.Entry({
            id: EventJournal.makeEntryIdUnsafe({ msecs: 2000 }),
            event: "Repro",
            primaryKey: "key",
            payload: new Uint8Array()
          }, { disableChecks: true })
          const older = new EventJournal.Entry({
            ...newer,
            id: EventJournal.makeEntryIdUnsafe({ msecs: 1000 })
          }, { disableChecks: true })
          const sameBatch = new EventJournal.Entry({
            ...newer,
            id: EventJournal.makeEntryIdUnsafe({ msecs: 1500 })
          }, { disableChecks: true })
          const seenConflicts: Array<ReadonlyArray<string>> = []
          const effect = ({ conflicts }: { conflicts: ReadonlyArray<EventJournal.Entry> }) =>
            Effect.sync(() => {
              seenConflicts.push(conflicts.map((entry) => entry.idString))
            })
          yield* journal.writeFromRemote({
            remoteId: EventJournal.makeRemoteIdUnsafe(),
            entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: newer })],
            effect
          })
          yield* journal.writeFromRemote({
            remoteId: EventJournal.makeRemoteIdUnsafe(),
            entries: [
              new EventJournal.RemoteEntry({ remoteSequence: 0, entry: older }),
              new EventJournal.RemoteEntry({ remoteSequence: 1, entry: sameBatch })
            ],
            effect
          })
          assert.deepStrictEqual(seenConflicts, [[], [newer.idString], [newer.idString]])
        }))

      it.effect("failed remote callbacks persist nothing and allow redelivery", () =>
        Effect.gen(function*() {
          const journal = yield* make
          const remoteId = EventJournal.makeRemoteIdUnsafe()
          const entry = new EventJournal.Entry({
            id: EventJournal.makeEntryIdUnsafe({ msecs: 1000 }),
            event: "Repro",
            primaryKey: "key",
            payload: new Uint8Array()
          }, { disableChecks: true })
          const entries = [new EventJournal.RemoteEntry({ remoteSequence: 0, entry })]
          const exit = yield* Effect.exit(journal.writeFromRemote({
            remoteId,
            entries,
            effect: () =>
              Effect.fail(
                new EventJournal.EventJournalError({
                  method: "writeFromRemote",
                  cause: "callback failed"
                })
              )
          }))
          assert.isTrue(Exit.isFailure(exit))
          const afterFailure = {
            entries: yield* journal.entries,
            sequence: yield* journal.nextRemoteSequence(remoteId)
          }
          let retryCalls = 0
          yield* journal.writeFromRemote({
            remoteId,
            entries,
            effect: () =>
              Effect.sync(() => {
                retryCalls++
              })
          })
          assert.deepStrictEqual({ afterFailure, retryCalls }, {
            afterFailure: { entries: [], sequence: 0 },
            retryCalls: 1
          })
          assert.deepStrictEqual((yield* journal.entries).map((entry) => entry.idString), [entry.idString])
          assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 1)
        }))
    })
  }

  it.effect("preserves write callback error identity", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      const error = new Error("callback failed")
      const actual = yield* Effect.flip(journal.write({
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array([1]),
        effect: () => Effect.fail(error)
      }))
      assert.strictEqual(actual, error)
    }))

  it.effect("preserves remote callback error identity", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      yield* journal.write({
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array([1]),
        effect: () => Effect.void
      })
      const error = new Error("callback failed")
      const actual = yield* Effect.flip(
        journal.withRemoteUncommited(EventJournal.makeRemoteIdUnsafe(), () => Effect.fail(error))
      )
      assert.strictEqual(actual, error)
    }))

  it.effect("commits only after the write callback succeeds", () =>
    Effect.gen(function*() {
      const sql = yield* SqliteClient.make({ filename: ":memory:" })
      const journal = yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, sql))
      yield* Effect.exit(journal.write({
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array([1]),
        effect: () => Effect.fail("callback failed")
      }))
      assert.deepStrictEqual(yield* journal.entries, [])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("writes and reads entries", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      let createdAt = 0
      yield* journal.write({
        event: "UserCreated",
        primaryKey: "user-1",
        payload: new Uint8Array([1]),
        effect: (entry) =>
          Effect.sync(() => {
            createdAt = entry.createdAtMillis
          })
      })
      const entries = yield* journal.entries
      assert.strictEqual(entries.length, 1)
      assert.strictEqual(entries[0].event, "UserCreated")
      assert.strictEqual(entries[0].createdAtMillis, createdAt)
    }))

  it.effect("writes remote entries and sequences", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const initial = yield* journal.nextRemoteSequence(remoteId)
      assert.strictEqual(initial, 0)

      const entryA = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "UserCreated",
        primaryKey: "user-2",
        payload: new Uint8Array([2])
      }, { disableChecks: true })
      const entryB = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "UserCreated",
        primaryKey: "user-3",
        payload: new Uint8Array([3])
      }, { disableChecks: true })
      const remoteEntries = [
        new EventJournal.RemoteEntry({ remoteSequence: 0, entry: entryA }),
        new EventJournal.RemoteEntry({ remoteSequence: 1, entry: entryB })
      ]
      const seenConflicts: Array<ReadonlyArray<EventJournal.Entry>> = []
      yield* journal.writeFromRemote({
        remoteId,
        entries: remoteEntries,
        effect: ({ conflicts }) =>
          Effect.sync(() => {
            seenConflicts.push(conflicts)
          })
      })
      const next = yield* journal.nextRemoteSequence(remoteId)
      assert.strictEqual(next, 2)

      let emptyCalls = 0
      const emptyResult = yield* journal.withRemoteUncommited(remoteId, () =>
        Effect.sync(() => {
          emptyCalls++
          return "called"
        }))
      assert.isTrue(Option.isNone(emptyResult))
      assert.strictEqual(emptyCalls, 0)

      yield* journal.write({
        event: "LocalCreated",
        primaryKey: "local-1",
        payload: new Uint8Array([4]),
        effect: () => Effect.void
      })
      let uncommittedCalls = 0
      const uncommitted = yield* journal.withRemoteUncommited(remoteId, (entries) =>
        Effect.sync(() => {
          uncommittedCalls++
          return entries
        }))
      if (Option.isNone(uncommitted)) assert.fail("Expected the callback result")
      assert.strictEqual(uncommitted.value.length, 1)
      assert.strictEqual(uncommitted.value[0].event, "LocalCreated")
      assert.strictEqual(uncommittedCalls, 1)
      assert.deepStrictEqual(seenConflicts, [[], []])
    }))
})
