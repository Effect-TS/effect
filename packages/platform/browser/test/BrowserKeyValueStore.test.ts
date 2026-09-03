import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as IndexedDb from "@effect/platform-browser/IndexedDb"
import { assert, describe, it } from "@effect/vitest"
import { Layer } from "effect"
import { testLayer } from "effect-test/unstable/persistence/KeyValueStore.test"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
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

  for (const scenario of ["bytes", "empty bytes", "string overwritten with bytes"] as const) {
    it.effect(`has recognizes ${scenario} without coercing text reads`, () => {
      const database = `kvs_binary_${crypto.randomUUID()}`
      const layer = BrowserKeyValueStore.layerIndexedDb({ database }).pipe(Layer.provide(layerFakeIndexedDb))
      const removeDatabase = Effect.callback<void>((resume) => {
        const request = indexedDB.deleteDatabase(database)
        request.onsuccess = () => resume(Effect.void)
        request.onerror = () => resume(Effect.die(request.error))
        request.onblocked = () => resume(Effect.die(new Error("test database deletion blocked")))
      })
      return Effect.gen(function*() {
        const store = yield* KeyValueStore.KeyValueStore
        assert.isFalse(yield* store.has("missing"))
        if (scenario === "string overwritten with bytes") {
          yield* store.set("key", "original")
          assert.isTrue(yield* store.has("key"))
          assert.strictEqual(yield* store.get("key"), "original")
          assert.isUndefined(yield* store.getUint8Array("key"))
        }
        const value = scenario === "empty bytes" ? new Uint8Array() : new Uint8Array([1, 2, 255])
        yield* store.set("key", value)
        assert.deepStrictEqual(yield* store.getUint8Array("key"), value)
        assert.strictEqual(yield* store.size, 1)
        assert.isFalse(yield* store.isEmpty)
        assert.isUndefined(yield* store.get("key"))
        assert.isTrue(yield* store.has("key"))
        yield* store.remove("key")
        assert.isFalse(yield* store.has("key"))
        assert.isUndefined(yield* store.getUint8Array("key"))
        assert.strictEqual(yield* store.size, 0)
        assert.isTrue(yield* store.isEmpty)
      }).pipe(Effect.provide(layer), Effect.ensuring(removeDatabase))
    })
  }

  for (const failRequest of [true, false]) {
    it.effect(
      failRequest
        ? "has maps request errors with its method and key"
        : "has retains read-request rather than transaction-commit completion",
      () => {
        const cause = new DOMException("Request failed", "AbortError")
        const events: Array<string> = []
        const db = {
          objectStoreNames: { contains: () => true },
          close() {
            events.push("close")
          },
          transaction(_name: string, mode: string) {
            events.push(mode)
            const transaction = {
              error: null as unknown,
              onabort: null as null | (() => void),
              objectStore() {
                const request = (key: string, result: unknown) => {
                  events.push(key)
                  const request = {
                    readyState: "pending",
                    result,
                    error: cause,
                    onsuccess: null as null | (() => void),
                    onerror: null as null | (() => void)
                  }
                  queueMicrotask(() => {
                    request.readyState = "done"
                    if (failRequest) request.onerror?.()
                    else request.onsuccess?.()
                    transaction.error = cause
                    events.push("abort-after-request")
                    transaction.onabort?.()
                  })
                  return request
                }
                return {
                  count: (key: string) => request(key, 1),
                  get: (key: string) => request(key, { key, value: "value" })
                }
              }
            }
            return transaction
          }
        }
        const fixture = {
          open() {
            const request = {
              readyState: "pending",
              result: db,
              error: null,
              onsuccess: null as null | (() => void)
            }
            queueMicrotask(() => {
              request.readyState = "done"
              request.onsuccess?.()
            })
            return request
          }
        }
        const layer = BrowserKeyValueStore.layerIndexedDb({ database: "owned_request_fixture" }).pipe(
          Layer.provide(Layer.succeed(
            IndexedDb.IndexedDb,
            IndexedDb.make({ indexedDB: fixture as unknown as IDBFactory, IDBKeyRange })
          ))
        )
        return Effect.gen(function*() {
          const store = yield* KeyValueStore.KeyValueStore
          const result = yield* Effect.result(store.has("request-key"))
          yield* Effect.yieldNow
          assert.deepStrictEqual(events, ["readonly", "request-key", "abort-after-request"])
          if (failRequest) {
            assert.isTrue(Result.isFailure(result))
            if (Result.isFailure(result)) {
              assert.strictEqual(result.failure.method, "has")
              assert.strictEqual(result.failure.key, "request-key")
              assert.strictEqual(result.failure.cause, cause)
            }
          } else {
            assert.deepStrictEqual(result, Result.succeed(true))
          }
        }).pipe(Effect.provide(layer))
      }
    )
  }

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
})
