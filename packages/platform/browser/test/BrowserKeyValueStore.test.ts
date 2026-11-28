import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as IndexedDb from "@effect/platform-browser/IndexedDb"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Exit, Layer } from "effect"
import { testLayer } from "effect-test/persistence/KeyValueStore.test"
import * as Effect from "effect/Effect"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import * as Result from "effect/Result"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

describe("KeyValueStore / layerLocalStorage", () => testLayer(BrowserKeyValueStore.layerLocalStorage))

describe("KeyValueStore / layerSessionStorage", () => testLayer(BrowserKeyValueStore.layerSessionStorage))

describe("KeyValueStore / layerIndexedDb", () => {
  const layerFakeIndexedDb = Layer.succeed(
    IndexedDb.IndexedDb,
    IndexedDb.make({ indexedDB, IDBKeyRange })
  )

  testLayer(
    BrowserKeyValueStore.layerIndexedDb({ database: "kvs_test_db" }).pipe(
      Layer.provide(layerFakeIndexedDb)
    )
  )

  it.effect("reports a key containing bytes as present", () => {
    const layer = BrowserKeyValueStore.layerIndexedDb({
      database: `kvs_binary_has_${crypto.randomUUID()}`
    }).pipe(Layer.provide(layerFakeIndexedDb))

    return Effect.gen(function*() {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set("binary", new Uint8Array([0, 127, 255]))
      assert.isTrue(yield* store.has("binary"))
    }).pipe(Effect.provide(layer))
  })

  it.effect("does not report a write before its transaction commits", () => {
    const db = {
      objectStoreNames: { contains: () => true },
      close() {},
      transaction() {
        const transaction = {
          error: null as unknown,
          onabort: null as null | (() => void),
          objectStore() {
            return {
              put() {
                const request = {
                  readyState: "pending",
                  result: undefined,
                  error: null,
                  onsuccess: null as null | (() => void),
                  onerror: null as null | (() => void)
                }
                queueMicrotask(() => {
                  request.readyState = "done"
                  request.onsuccess?.()
                  transaction.error = new DOMException("Commit failed", "AbortError")
                  transaction.onabort?.()
                })
                return request
              }
            }
          }
        }
        return transaction
      }
    }
    const failingIndexedDb = {
      open() {
        const request = {
          readyState: "pending",
          result: undefined as unknown,
          error: null,
          onsuccess: null as null | (() => void),
          onerror: null as null | (() => void),
          onupgradeneeded: null as null | (() => void)
        }
        queueMicrotask(() => {
          request.readyState = "done"
          request.result = db
          request.onsuccess?.()
        })
        return request
      }
    }
    const layer = BrowserKeyValueStore.layerIndexedDb({ database: "transaction_repro" }).pipe(
      Layer.provide(Layer.succeed(
        IndexedDb.IndexedDb,
        IndexedDb.make({ indexedDB: failingIndexedDb as unknown as IDBFactory, IDBKeyRange })
      ))
    )

    return Effect.gen(function*() {
      const store = yield* KeyValueStore.KeyValueStore
      const result = yield* Effect.result(store.set("key", "value"))
      yield* Effect.yieldNow
      assert.isTrue(Result.isFailure(result), "the aborted transaction was reported as successful")
    }).pipe(Effect.provide(layer))
  })

  it.effect("fails with KeyValueStoreError when indexedDB.open throws synchronously", () => {
    const cause = new DOMException("blocked", "SecurityError")
    const failingOpen = Layer.succeed(
      IndexedDb.IndexedDb,
      IndexedDb.make({
        indexedDB: {
          open() {
            throw cause
          }
        } as unknown as IDBFactory,
        IDBKeyRange
      })
    )
    const layer = BrowserKeyValueStore.layerIndexedDb({ database: "open_throw_repro" }).pipe(
      Layer.provide(failingOpen)
    )

    return Effect.gen(function*() {
      const exit = yield* Effect.exit(
        Effect.gen(function*() {
          const store = yield* KeyValueStore.KeyValueStore
          return yield* store.get("k")
        }).pipe(Effect.provide(layer))
      )
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        assert.isFalse(Cause.hasDies(exit.cause))
        assert.isTrue(Cause.hasFails(exit.cause))
        const error = Cause.squash(exit.cause)
        assert.instanceOf(error, KeyValueStore.KeyValueStoreError)
        if (error instanceof KeyValueStore.KeyValueStoreError) {
          assert.strictEqual(error.method, "open")
          assert.strictEqual(error.cause, cause)
        }
      }
    })
  })

  it.effect("fails with KeyValueStoreError when indexedDB.open request errors", () => {
    const cause = new DOMException("open failed", "UnknownError")
    const failingOpen = Layer.succeed(
      IndexedDb.IndexedDb,
      IndexedDb.make({
        indexedDB: {
          open() {
            const request = {
              readyState: "pending",
              result: undefined,
              error: null as unknown,
              onsuccess: null as null | (() => void),
              onerror: null as null | (() => void),
              onupgradeneeded: null as null | (() => void)
            }
            queueMicrotask(() => {
              request.readyState = "done"
              request.error = cause
              request.onerror?.()
            })
            return request
          }
        } as unknown as IDBFactory,
        IDBKeyRange
      })
    )
    const layer = BrowserKeyValueStore.layerIndexedDb({ database: "open_error_repro" }).pipe(
      Layer.provide(failingOpen)
    )

    return Effect.gen(function*() {
      const exit = yield* Effect.exit(
        Effect.gen(function*() {
          const store = yield* KeyValueStore.KeyValueStore
          return yield* store.get("k")
        }).pipe(Effect.provide(layer))
      )
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        assert.isFalse(Cause.hasDies(exit.cause))
        assert.isTrue(Cause.hasFails(exit.cause))
        const error = Cause.squash(exit.cause)
        assert.instanceOf(error, KeyValueStore.KeyValueStoreError)
        if (error instanceof KeyValueStore.KeyValueStoreError) {
          assert.strictEqual(error.method, "open")
          assert.strictEqual(error.cause, cause)
        }
      }
    })
  })

  it.effect("fails with KeyValueStoreError on synchronous IndexedDB read and write throws", () => {
    const readCause = new DOMException("closed", "InvalidStateError")
    const writeCause = new DOMException("quota", "QuotaExceededError")
    let aborted = 0
    const db = {
      objectStoreNames: { contains: () => true },
      close() {},
      transaction(_name: string, mode: IDBTransactionMode) {
        if (mode === "readonly") {
          throw readCause
        }
        return {
          abort() {
            aborted++
          },
          objectStore() {
            return {
              put() {
                throw writeCause
              }
            }
          }
        }
      }
    }
    const stubIndexedDb = {
      open() {
        const request = {
          readyState: "pending",
          result: undefined as unknown,
          error: null,
          onsuccess: null as null | (() => void),
          onerror: null as null | (() => void),
          onupgradeneeded: null as null | (() => void)
        }
        queueMicrotask(() => {
          request.readyState = "done"
          request.result = db
          request.onsuccess?.()
        })
        return request
      }
    }
    const layer = BrowserKeyValueStore.layerIndexedDb({ database: "sync_throw_repro" }).pipe(
      Layer.provide(Layer.succeed(
        IndexedDb.IndexedDb,
        IndexedDb.make({ indexedDB: stubIndexedDb as unknown as IDBFactory, IDBKeyRange })
      ))
    )

    return Effect.gen(function*() {
      const store = yield* KeyValueStore.KeyValueStore

      const readExit = yield* Effect.exit(store.get("k"))
      assert.isTrue(Exit.isFailure(readExit))
      if (Exit.isFailure(readExit)) {
        assert.isFalse(Cause.hasDies(readExit.cause))
        assert.isTrue(Cause.hasFails(readExit.cause))
        const error = Cause.squash(readExit.cause)
        assert.instanceOf(error, KeyValueStore.KeyValueStoreError)
        if (error instanceof KeyValueStore.KeyValueStoreError) {
          assert.strictEqual(error.method, "get")
          assert.strictEqual(error.cause, readCause)
        }
      }

      const writeExit = yield* Effect.exit(store.set("k", "v"))
      assert.isTrue(Exit.isFailure(writeExit))
      if (Exit.isFailure(writeExit)) {
        assert.isFalse(Cause.hasDies(writeExit.cause))
        assert.isTrue(Cause.hasFails(writeExit.cause))
        const error = Cause.squash(writeExit.cause)
        assert.instanceOf(error, KeyValueStore.KeyValueStoreError)
        if (error instanceof KeyValueStore.KeyValueStoreError) {
          assert.strictEqual(error.method, "set")
          assert.strictEqual(error.cause, writeCause)
        }
      }
      assert.strictEqual(aborted, 1)
    }).pipe(Effect.provide(layer))
  })
})
