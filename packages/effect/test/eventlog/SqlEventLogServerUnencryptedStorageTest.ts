import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Option, Queue, Stream } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import type { StoreId } from "effect/eventlog/EventLogMessage"
import * as SqlEventLogServerUnencrypted from "effect/eventlog/SqlEventLogServerUnencrypted"
import { Reactivity } from "effect/reactivity"
import type * as SqlClient from "effect/sql/SqlClient"

let nextNamespace = 0

const uniqueNamespace = (prefix: string) => `${prefix}_${++nextNamespace}`

const makeOptions = (prefix: string) => {
  const namespace = uniqueNamespace(prefix)
  return {
    entryTablePrefix: `effect_events_${namespace}`,
    remoteIdTable: `effect_remote_id_${namespace}`,
    insertBatchSize: 2
  }
}

const makeStoreId = (prefix: string) => `${uniqueNamespace(prefix)}_store` as StoreId

const makeEntry = (
  name: string,
  options: {
    readonly id?: EventJournal.EntryId | undefined
    readonly primaryKey?: string | undefined
  } = {}
) =>
  new EventJournal.Entry({
    id: options.id ?? EventJournal.makeEntryIdUnsafe(),
    event: "UserNameSet",
    primaryKey: options.primaryKey ?? "user-1",
    payload: new TextEncoder().encode(name)
  }, { disableChecks: true })

const makeStorage = (options: {
  readonly entryTablePrefix?: string
  readonly remoteIdTable?: string
  readonly insertBatchSize?: number
}) =>
  SqlEventLogServerUnencrypted.makeStorage(options).pipe(
    Effect.orDie
  )

export const suite = (name: string, layer: Layer.Layer<SqlClient.SqlClient, unknown>) =>
  it.layer(
    Layer.mergeAll(Reactivity.layer, layer),
    { timeout: "30 seconds" }
  )(`SqlEventLogServerUnencrypted (${name})`, (it) => {
    it.effect("persists remote id across storage instances", () =>
      Effect.gen(function*() {
        const options = makeOptions("remote_id")
        const storageA = yield* makeStorage(options)
        const storageB = yield* makeStorage(options)

        const idA = yield* storageA.getId
        const idB = yield* storageB.getId

        assert.deepStrictEqual(idA, idB)
      }))

    it.effect("replays backlog and then streams live changes without startup duplication", () =>
      Effect.gen(function*() {
        const storage = yield* makeStorage(makeOptions("changes_backlog_then_live"))
        const storeId = makeStoreId("changes")
        const entryA = makeEntry("Ada")
        const entryB = makeEntry("Grace")
        const entryC = makeEntry("Margaret")

        yield* storage.write(storeId, [entryA, entryB])

        const changes = yield* storage.changes({
          storeId,
          startSequence: 0,
          compactors: new Map()
        }).pipe(
          Stream.toQueue({ capacity: "unbounded" })
        )
        const replayed = yield* Queue.takeAll(changes)

        assert.deepStrictEqual(replayed.map((entry) => entry.remoteSequence), [1, 2])
        assert.deepStrictEqual(replayed.map((entry) => entry.entry.idString), [entryA.idString, entryB.idString])

        yield* storage.write(storeId, [entryC])

        const next = yield* Queue.take(changes)
        assert.strictEqual(next.remoteSequence, 3)
        assert.strictEqual(next.entry.idString, entryC.idString)

        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)
      }))

    it.effect("handles the changes startup race without losing or duplicating rows", () =>
      Effect.gen(function*() {
        const storage = yield* makeStorage(makeOptions("changes_startup_race"))

        for (let iteration = 0; iteration < 5; iteration++) {
          const storeId = makeStoreId(`startup_race_${iteration}`)
          const backlogEntry = makeEntry(`Ada_${iteration}`)
          const racedEntry = makeEntry(`Grace_${iteration}`)

          yield* storage.write(storeId, [backlogEntry])

          const changesFiber = yield* storage.changes({
            storeId,
            startSequence: 0,
            compactors: new Map()
          }).pipe(
            Stream.toQueue({ capacity: "unbounded" }),
            Effect.forkChild
          )
          yield* storage.write(storeId, [racedEntry])
          const changes = yield* Fiber.join(changesFiber)

          const first = yield* Queue.take(changes)
          const second = yield* Queue.take(changes)

          assert.deepStrictEqual(
            [first.remoteSequence, second.remoteSequence],
            [1, 2],
            `iteration ${iteration} should deliver exactly the backlog row and the raced row`
          )
          assert.deepStrictEqual(
            [first.entry.idString, second.entry.idString],
            [backlogEntry.idString, racedEntry.idString]
          )

          yield* Effect.yieldNow
          assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)
        }
      }))

    it.effect("isolates reads and streams between stores", () =>
      Effect.gen(function*() {
        const storage = yield* makeStorage(makeOptions("store_isolation"))
        const storeA = makeStoreId("isolation_a")
        const storeB = makeStoreId("isolation_b")
        const entryA1 = makeEntry("Ada")
        const entryB1 = makeEntry("Grace")
        const entryA2 = makeEntry("Margaret")
        const entryB2 = makeEntry("Linus")

        yield* storage.write(storeA, [entryA1])
        yield* storage.write(storeB, [entryB1])

        const changesA = yield* storage.changes({
          storeId: storeA,
          startSequence: 0,
          compactors: new Map()
        }).pipe(
          Stream.toQueue({ capacity: "unbounded" })
        )
        const backlogA = yield* Queue.takeAll(changesA)
        assert.deepStrictEqual(backlogA.map((entry) => entry.entry.idString), [entryA1.idString])

        yield* storage.write(storeB, [entryB2])
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changesA)), true)

        yield* storage.write(storeA, [entryA2])
        const nextA = yield* Queue.take(changesA)

        assert.strictEqual(nextA.remoteSequence, 2)
        assert.strictEqual(nextA.entry.idString, entryA2.idString)
      }))

    it.effect("commits outer writes but discards a caught nested rollback and its notifications", () =>
      Effect.gen(function*() {
        const options = makeOptions("nested_rollback")
        const storage = yield* makeStorage(options)
        const storeId = makeStoreId("nested_rollback")
        const backlog = makeEntry("Ada")
        const before = makeEntry("Grace")
        const rolledBack = makeEntry("Margaret")
        const after = makeEntry("Linus")
        const sentinel = makeEntry("Barbara")
        yield* storage.write(storeId, [backlog])
        const changes = yield* storage.changes({ storeId, startSequence: 0, compactors: new Map() }).pipe(
          Stream.toQueue({ capacity: "unbounded" })
        )
        assert.strictEqual((yield* Queue.take(changes)).entry.idString, backlog.idString)

        yield* storage.withTransaction(Effect.gen(function*() {
          yield* storage.write(storeId, [before])
          const error = yield* storage.withTransaction(Effect.gen(function*() {
            yield* storage.write(storeId, [rolledBack])
            return yield* Effect.fail("nested rollback")
          })).pipe(Effect.flip)
          assert.strictEqual(error, "nested rollback")
          yield* storage.write(storeId, [after])
        }))
        yield* storage.write(storeId, [sentinel])
        const live = [yield* Queue.take(changes), yield* Queue.take(changes), yield* Queue.take(changes)]
        assert.deepStrictEqual(live.map((row) => row.remoteSequence), [2, 3, 4])
        assert.deepStrictEqual(live.map((row) => row.entry.idString), [
          before.idString,
          after.idString,
          sentinel.idString
        ])
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)

        const reopened = yield* makeStorage(options)
        const replay = yield* reopened.changes({ storeId, startSequence: 0, compactors: new Map() }).pipe(
          Stream.toQueue({ capacity: "unbounded" })
        )
        const persisted = yield* Queue.takeAll(replay)
        assert.deepStrictEqual(persisted.map((row) => row.remoteSequence), [1, 2, 3, 4])
        assert.deepStrictEqual(persisted.map((row) => row.entry.idString), [
          backlog.idString,
          before.idString,
          after.idString,
          sentinel.idString
        ])
      }))

    it.effect("persists and streams multiple successful transaction levels in write order exactly once", () =>
      Effect.gen(function*() {
        const options = makeOptions("multiple_nesting")
        const storage = yield* makeStorage(options)
        const storeId = makeStoreId("multiple_nesting")
        const backlog = makeEntry("Ada")
        const outer = makeEntry("Grace")
        const nested = makeEntry("Margaret")
        const deepest = makeEntry("Linus")
        const after = makeEntry("Barbara")
        const sentinel = makeEntry("Donald")
        yield* storage.write(storeId, [backlog])
        const changes = yield* storage.changes({ storeId, startSequence: 0, compactors: new Map() }).pipe(
          Stream.toQueue({ capacity: "unbounded" })
        )
        assert.strictEqual((yield* Queue.take(changes)).entry.idString, backlog.idString)

        yield* storage.withTransaction(Effect.gen(function*() {
          yield* storage.write(storeId, [outer])
          yield* storage.withTransaction(Effect.gen(function*() {
            yield* storage.write(storeId, [nested])
            yield* storage.withTransaction(storage.write(storeId, [deepest]))
          }))
          yield* storage.write(storeId, [after])
        }))
        // If a nesting level loses its buffer, the sentinel exposes the gap.
        yield* storage.write(storeId, [sentinel])
        const live = yield* Effect.forEach([0, 1, 2, 3, 4], () => Queue.take(changes))
        assert.deepStrictEqual(live.map((row) => row.remoteSequence), [2, 3, 4, 5, 6])
        assert.deepStrictEqual(live.map((row) => row.entry.idString), [
          outer.idString,
          nested.idString,
          deepest.idString,
          after.idString,
          sentinel.idString
        ])
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)

        const reopened = yield* makeStorage(options)
        const replay = yield* reopened.changes({ storeId, startSequence: 0, compactors: new Map() }).pipe(
          Stream.toQueue({ capacity: "unbounded" })
        )
        const persisted = yield* Queue.takeAll(replay)
        assert.deepStrictEqual(persisted.map((row) => row.remoteSequence), [1, 2, 3, 4, 5, 6])
        assert.deepStrictEqual(persisted.map((row) => row.entry.idString), [
          backlog.idString,
          outer.idString,
          nested.idString,
          deepest.idString,
          after.idString,
          sentinel.idString
        ])
      }))

    it.effect("discards outer rollback rows and notifications, including successful nested writes", () =>
      Effect.gen(function*() {
        const options = makeOptions("outer_rollback")
        const storage = yield* makeStorage(options)
        const storeId = makeStoreId("outer_rollback")
        const backlog = makeEntry("Ada")
        const rolledBack = makeEntry("Grace")
        const nested = makeEntry("Margaret")
        const sentinel = makeEntry("Linus")
        yield* storage.write(storeId, [backlog])
        const changes = yield* storage.changes({ storeId, startSequence: 0, compactors: new Map() }).pipe(
          Stream.toQueue({ capacity: "unbounded" })
        )
        assert.strictEqual((yield* Queue.take(changes)).entry.idString, backlog.idString)

        const error = yield* storage.withTransaction(Effect.gen(function*() {
          yield* storage.write(storeId, [rolledBack])
          yield* storage.withTransaction(storage.write(storeId, [nested]))
          return yield* Effect.fail("rollback")
        })).pipe(Effect.flip)
        assert.strictEqual(error, "rollback")

        // The sentinel makes a leaked rollback notification fail by identity,
        // rather than relying on a sleep to prove that no notification arrived.
        yield* storage.write(storeId, [sentinel])
        const live = yield* Queue.take(changes)
        assert.strictEqual(live.remoteSequence, 2)
        assert.strictEqual(live.entry.idString, sentinel.idString)
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)

        const reopened = yield* makeStorage(options)
        const replay = yield* reopened.changes({ storeId, startSequence: 0, compactors: new Map() }).pipe(
          Stream.toQueue({ capacity: "unbounded" })
        )
        const persisted = yield* Queue.takeAll(replay)
        assert.deepStrictEqual(persisted.map((row) => row.remoteSequence), [1, 2])
        assert.deepStrictEqual(persisted.map((row) => row.entry.idString), [backlog.idString, sentinel.idString])
      }))
  })
