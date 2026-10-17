import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Option } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
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
  for (const [name, make] of [["SQL", makeJournal], ["memory", EventJournal.makeMemory]] as const) {
    describe(name, () => {
      it.effect("replays each remote batch in one callback with strictly newer same-event-and-key conflicts", () =>
        Effect.gen(function*() {
          const journal = yield* make
          const entry = (msecs: number, event = "Repro", primaryKey = "key") =>
            new EventJournal.Entry({
              id: EventJournal.makeEntryIdUnsafe({ msecs }),
              event,
              primaryKey,
              payload: new Uint8Array()
            }, { disableChecks: true })
          const newer = entry(2000)
          const otherEvent = entry(3000, "Other")
          const otherKey = entry(3000, "Repro", "other")
          const older = entry(1000)
          const sameBatch = entry(1500)
          const sameMillis = entry(2000)
          const otherKeyOlder = entry(1000, "Repro", "other")
          const batches: Array<
            ReadonlyArray<{ readonly entry: EventJournal.Entry; readonly conflicts: ReadonlyArray<EventJournal.Entry> }>
          > = []
          const writeBatch = (entries: ReadonlyArray<EventJournal.Entry>) =>
            journal.writeFromRemote({
              remoteId: EventJournal.makeRemoteIdUnsafe(),
              entries: entries.map((entry, remoteSequence) => new EventJournal.RemoteEntry({ remoteSequence, entry })),
              effect: (batch) =>
                Effect.sync(() => {
                  batches.push(batch)
                })
            })
          yield* writeBatch([newer, otherEvent, otherKey])
          yield* writeBatch([older, sameBatch, sameMillis, otherKeyOlder])

          assert.strictEqual(batches.length, 2)
          // Conflicts exclude the incoming batch, equal timestamps, and other
          // event/key pairs.
          assert.deepStrictEqual(
            batches.map((batch) =>
              batch.map(({ conflicts, entry }) => [entry.idString, conflicts.map((c) => c.idString)])
            ),
            [
              [[newer.idString, []], [otherEvent.idString, []], [otherKey.idString, []]],
              [
                [older.idString, [newer.idString]],
                [sameBatch.idString, [newer.idString]],
                [sameMillis.idString, []],
                [otherKeyOlder.idString, [otherKey.idString]]
              ]
            ]
          )
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
        effect: (batch) =>
          Effect.sync(() => {
            for (const { conflicts } of batch) seenConflicts.push(conflicts)
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
