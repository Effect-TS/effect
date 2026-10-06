import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Option, Queue } from "effect"
import {
  makeEntry,
  makeOptions,
  makeStorage,
  makeStoreId,
  openChanges,
  suite
} from "effect-test/eventlog/SqlEventLogServerUnencryptedStorageTest"
import { Reactivity } from "effect/reactivity"
import { PreventSchedulerYield } from "effect/Scheduler"
import * as SqlClient from "effect/sql/SqlClient"
import { PgContainer } from "./utils.ts"

suite("sql-pg", PgContainer.layerClient)

it.layer(Layer.merge(Reactivity.layer, PgContainer.layerClient), { timeout: "30 seconds" })(
  "SqlEventLogServerUnencrypted commit visibility",
  (it) => {
    it.effect("streams concurrent commits in sequence order even when the first SQL return is delayed", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const committed = yield* Deferred.make<void>()
        const publish = yield* Deferred.make<void>()
        // Decorate the public SQL boundary, not storage internals. The real
        // transaction has committed and released its connection before we pause.
        let pauseNext = false
        let observeSecond = false
        let secondEnteredSql = false
        const delayedSql: SqlClient.SqlClient = Object.assign(
          (...args: Parameters<SqlClient.SqlClient>) => sql(...args),
          sql,
          {
            withTransaction: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
              Effect.suspend(() => {
                if (observeSecond) secondEnteredSql = true
                const pause = pauseNext
                pauseNext = false
                return sql.withTransaction(effect).pipe(
                  Effect.tap(() =>
                    pause
                      ? Deferred.succeed(committed, undefined).pipe(Effect.andThen(Deferred.await(publish)))
                      : Effect.void
                  )
                )
              })
          }
        )
        const storage = yield* makeStorage(makeOptions("concurrent_publication")).pipe(
          Effect.provideService(SqlClient.SqlClient, delayedSql)
        )
        const storeId = makeStoreId("concurrent_publication")
        const backlog = makeEntry("Ada")
        const firstEntry = makeEntry("Grace")
        const secondEntry = makeEntry("Margaret")
        yield* storage.write(storeId, [backlog])
        const changes = yield* openChanges(storage, storeId)
        assert.strictEqual((yield* Queue.take(changes)).remoteSequence, 1)

        pauseNext = true
        const firstWriter = yield* storage.write(storeId, [firstEntry]).pipe(Effect.forkChild)
        yield* Deferred.await(committed)
        // Run writer two synchronously to its first asynchronous boundary,
        // without a cooperative scheduler yield before it reaches SQL (or waits
        // for a storage transaction permit). This observes only the public SQL
        // boundary, not the implementation of any ordering lock.
        observeSecond = true
        const secondWriter = yield* storage.write(storeId, [secondEntry]).pipe(
          Effect.provideService(PreventSchedulerYield, true),
          Effect.forkChild({ startImmediately: true })
        )
        observeSecond = false
        if (secondEnteredSql) {
          // An unserialized writer must commit and publish before writer one
          // returns, making the existing reordering failure deterministic.
          yield* Fiber.join(secondWriter).pipe(
            Effect.ensuring(Deferred.succeed(publish, undefined))
          )
        } else {
          // A serialized writer is waiting outside SQL. Let writer one publish
          // and release its permit before waiting for writer two to complete.
          yield* Deferred.succeed(publish, undefined)
          yield* Fiber.join(secondWriter)
        }
        yield* Fiber.join(firstWriter)

        const rows = yield* Queue.takeN(changes, 2)
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)
        const persisted = yield* Queue.takeAll(yield* openChanges(storage, storeId))
        assert.deepStrictEqual(persisted.map((row) => row.remoteSequence), [1, 2, 3])
        assert.deepStrictEqual(
          persisted.map((row) => row.entry.idString),
          [backlog.idString, firstEntry.idString, secondEntry.idString]
        )
        assert.deepStrictEqual(rows.map((row) => row.remoteSequence), [2, 3])
        assert.deepStrictEqual(rows.map((row) => row.entry.idString), [firstEntry.idString, secondEntry.idString])
      }))

    it.effect("streams a write committed after the startup backlog read exactly once", () =>
      Effect.gen(function*() {
        const storage = yield* makeStorage(makeOptions("commit_visibility"))
        const storeId = makeStoreId("commit_visibility")
        const backlogEntry = makeEntry("Ada")
        const racedEntry = makeEntry("Grace")
        const liveEntry = makeEntry("Margaret")
        yield* storage.write(storeId, [backlogEntry])

        const written = yield* Deferred.make<void>()
        const commit = yield* Deferred.make<void>()
        const writer = yield* storage.withTransaction(Effect.gen(function*() {
          yield* storage.write(storeId, [racedEntry])
          yield* Deferred.succeed(written, undefined)
          yield* Deferred.await(commit)
        })).pipe(Effect.forkChild)
        yield* Deferred.await(written)

        // Start between the write and its commit. Reading the backlog row proves
        // the subscription and the independent snapshot read have completed.
        const changes = yield* openChanges(storage, storeId)
        const first = yield* Queue.take(changes)
        assert.strictEqual(first.entry.idString, backlogEntry.idString)

        yield* Deferred.succeed(commit, undefined)
        yield* Fiber.join(writer)
        // A later write makes a missed row fail as [1, 3], rather than timing out.
        yield* storage.write(storeId, [liveEntry])
        const second = yield* Queue.take(changes)
        assert.deepStrictEqual([first.remoteSequence, second.remoteSequence], [1, 2])
        assert.strictEqual(second.entry.idString, racedEntry.idString)
        const third = yield* Queue.take(changes)
        assert.strictEqual(third.remoteSequence, 3)
        assert.strictEqual(third.entry.idString, liveEntry.idString)
        yield* Effect.yieldNow
        assert.strictEqual(Option.isNone(yield* Queue.poll(changes)), true)
      }))
  }
)
