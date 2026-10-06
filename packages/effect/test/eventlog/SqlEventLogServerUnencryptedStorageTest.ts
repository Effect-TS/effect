import { assert, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, Layer, Option, Queue, Stream } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import type { StoreId } from "effect/eventlog/EventLogMessage"
import type * as EventLogServerUnencrypted from "effect/eventlog/EventLogServerUnencrypted"
import * as SqlEventLogServerUnencrypted from "effect/eventlog/SqlEventLogServerUnencrypted"
import { Reactivity } from "effect/reactivity"
import * as SqlClient from "effect/sql/SqlClient"

let nextNamespace = 0

const uniqueNamespace = (prefix: string) => `${prefix}_${++nextNamespace}`

export const makeOptions = (prefix: string) => {
  const namespace = uniqueNamespace(prefix)
  return {
    entryTablePrefix: `effect_events_${namespace}`,
    remoteIdTable: `effect_remote_id_${namespace}`,
    insertBatchSize: 2
  }
}

export const makeStoreId = (prefix: string) => `${uniqueNamespace(prefix)}_store` as StoreId

export const makeEntry = (
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

export const makeStorage = (options: {
  readonly entryTablePrefix?: string
  readonly remoteIdTable?: string
  readonly insertBatchSize?: number
}) =>
  SqlEventLogServerUnencrypted.makeStorage(options).pipe(
    Effect.orDie
  )

export const openChanges = (storage: EventLogServerUnencrypted.Storage["Service"], storeId: StoreId) =>
  storage.changes({ storeId, startSequence: 0, compactors: new Map() }).pipe(
    Stream.toQueue({ capacity: "unbounded" })
  )

const assertEntries = (
  rows: ReadonlyArray<EventJournal.RemoteEntry>,
  expected: ReadonlyArray<EventJournal.Entry>,
  startSequence: number
) => {
  assert.deepStrictEqual(rows.map((row) => row.remoteSequence), expected.map((_, index) => startSequence + index))
  assert.deepStrictEqual(rows.map((row) => row.entry.idString), expected.map((entry) => entry.idString))
}

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

        const changes = yield* openChanges(storage, storeId)
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

          const changesFiber = yield* openChanges(storage, storeId).pipe(Effect.forkChild)
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

        const changesA = yield* openChanges(storage, storeA)
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
        const storage = yield* makeStorage(makeOptions("nested_rollback"))
        const storeId = makeStoreId("nested_rollback")
        const backlog = makeEntry("Ada")
        const before = makeEntry("Grace")
        const rolledBack = makeEntry("Margaret")
        const after = makeEntry("Linus")
        const sentinel = makeEntry("Barbara")
        yield* storage.write(storeId, [backlog])
        const changes = yield* openChanges(storage, storeId)
        assertEntries([yield* Queue.take(changes)], [backlog], 1)

        yield* storage.withTransaction(Effect.gen(function*() {
          yield* storage.write(storeId, [before])
          const error = yield* storage.withTransaction(Effect.gen(function*() {
            yield* storage.write(storeId, [rolledBack])
            return yield* Effect.fail("nested rollback")
          })).pipe(Effect.flip)
          assert.strictEqual(error, "nested rollback")
          yield* storage.write(storeId, [after])
        }))
        // The sentinel exposes leaked notifications without sleeps.
        yield* storage.write(storeId, [sentinel])
        assertEntries(yield* Queue.takeN(changes, 3), [before, after, sentinel], 2)
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)

        const persisted = yield* Queue.takeAll(yield* openChanges(storage, storeId))
        assertEntries(persisted, [backlog, before, after, sentinel], 1)
      }))

    it.effect("persists and streams multiple successful transaction levels in write order exactly once", () =>
      Effect.gen(function*() {
        const storage = yield* makeStorage(makeOptions("multiple_nesting"))
        const storeId = makeStoreId("multiple_nesting")
        const backlog = makeEntry("Ada")
        const outer = makeEntry("Grace")
        const nested = makeEntry("Margaret")
        const deepest = makeEntry("Linus")
        const after = makeEntry("Barbara")
        const sentinel = makeEntry("Donald")
        yield* storage.write(storeId, [backlog])
        const changes = yield* openChanges(storage, storeId)
        assertEntries([yield* Queue.take(changes)], [backlog], 1)

        yield* storage.withTransaction(Effect.gen(function*() {
          yield* storage.write(storeId, [outer])
          yield* storage.withTransaction(Effect.gen(function*() {
            yield* storage.write(storeId, [nested])
            yield* storage.withTransaction(storage.write(storeId, [deepest]))
          }))
          yield* storage.write(storeId, [after])
        }))
        yield* storage.write(storeId, [sentinel])
        assertEntries(yield* Queue.takeN(changes, 5), [outer, nested, deepest, after, sentinel], 2)
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)

        const persisted = yield* Queue.takeAll(yield* openChanges(storage, storeId))
        assertEntries(persisted, [backlog, outer, nested, deepest, after, sentinel], 1)
      }))

    it.effect("streams concurrent sibling transactions in sequence order exactly once", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const completed = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        let pauseNext = false
        // Pause after savepoint completion releases the SQL permit, before storage merges the buffer.
        const delayedSql: SqlClient.SqlClient = Object.assign(
          (...args: Parameters<SqlClient.SqlClient>) => sql(...args),
          sql,
          {
            withTransaction: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
              Effect.suspend(() => {
                const pause = pauseNext
                pauseNext = false
                return sql.withTransaction(effect).pipe(
                  Effect.tap(() =>
                    pause
                      ? Deferred.succeed(completed, undefined).pipe(Effect.andThen(Deferred.await(release)))
                      : Effect.void
                  )
                )
              })
          }
        )
        const storage = yield* makeStorage(makeOptions("sibling_ordering")).pipe(
          Effect.provideService(SqlClient.SqlClient, delayedSql)
        )
        const storeId = makeStoreId("sibling_ordering")
        const backlog = makeEntry("Ada")
        const first = makeEntry("Grace")
        const second = makeEntry("Margaret")
        const sentinel = makeEntry("Linus")
        yield* storage.write(storeId, [backlog])
        const changes = yield* openChanges(storage, storeId)
        assertEntries([yield* Queue.take(changes)], [backlog], 1)

        yield* storage.withTransaction(Effect.gen(function*() {
          pauseNext = true
          const writer = yield* storage.write(storeId, [first]).pipe(Effect.forkChild)
          yield* Deferred.await(completed)
          yield* storage.write(storeId, [second]).pipe(
            Effect.ensuring(Deferred.succeed(release, undefined))
          )
          yield* Fiber.join(writer)
        }))
        yield* storage.write(storeId, [sentinel])
        const rows = yield* Queue.takeN(changes, 3)
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)
        assertEntries(yield* Queue.takeAll(yield* openChanges(storage, storeId)), [backlog, first, second, sentinel], 1)
        assertEntries(rows, [first, second, sentinel], 2)
      }))

    it.effect("rolls back an interrupted pre-commit body without publishing its writes", () =>
      Effect.gen(function*() {
        const storage = yield* makeStorage(makeOptions("interrupted_transaction"))
        const storeId = makeStoreId("interrupted_transaction")
        const backlog = makeEntry("Ada")
        const rolledBack = makeEntry("Grace")
        const sentinel = makeEntry("Margaret")
        yield* storage.write(storeId, [backlog])
        const changes = yield* openChanges(storage, storeId)
        assertEntries([yield* Queue.take(changes)], [backlog], 1)

        const written = yield* Deferred.make<void>()
        const writer = yield* storage.withTransaction(Effect.gen(function*() {
          yield* storage.write(storeId, [rolledBack])
          yield* Deferred.succeed(written, undefined)
          return yield* Effect.never
        })).pipe(Effect.forkChild)
        yield* Deferred.await(written)
        yield* Fiber.interrupt(writer)
        const exit = yield* Fiber.await(writer)
        assert.strictEqual(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause), true)

        yield* storage.write(storeId, [sentinel])
        assertEntries([yield* Queue.take(changes)], [sentinel], 2)
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)
        assertEntries(yield* Queue.takeAll(yield* openChanges(storage, storeId)), [backlog, sentinel], 1)
      }))

    it.effect("discards outer rollback rows and notifications, including successful nested writes", () =>
      Effect.gen(function*() {
        const storage = yield* makeStorage(makeOptions("outer_rollback"))
        const storeId = makeStoreId("outer_rollback")
        const backlog = makeEntry("Ada")
        const rolledBack = makeEntry("Grace")
        const nested = makeEntry("Margaret")
        const sentinel = makeEntry("Linus")
        yield* storage.write(storeId, [backlog])
        const changes = yield* openChanges(storage, storeId)
        assertEntries([yield* Queue.take(changes)], [backlog], 1)

        const error = yield* storage.withTransaction(Effect.gen(function*() {
          yield* storage.write(storeId, [rolledBack])
          yield* storage.withTransaction(storage.write(storeId, [nested]))
          return yield* Effect.fail("rollback")
        })).pipe(Effect.flip)
        assert.strictEqual(error, "rollback")

        yield* storage.write(storeId, [sentinel])
        assertEntries([yield* Queue.take(changes)], [sentinel], 2)
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)

        const persisted = yield* Queue.takeAll(yield* openChanges(storage, storeId))
        assertEntries(persisted, [backlog, sentinel], 1)
      }))
  })
