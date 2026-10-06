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
import { PgContainer } from "./utils.ts"

suite("sql-pg", PgContainer.layerClient)

it.layer(Layer.merge(Reactivity.layer, PgContainer.layerClient), { timeout: "30 seconds" })(
  "SqlEventLogServerUnencrypted commit visibility",
  (it) => {
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
