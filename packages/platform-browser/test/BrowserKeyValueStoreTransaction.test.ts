import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as IndexedDb from "@effect/platform-browser/IndexedDb"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
import { IDBKeyRange } from "fake-indexeddb"

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
  const indexedDB = {
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
      IndexedDb.make({ indexedDB: indexedDB as IDBFactory, IDBKeyRange })
    ))
  )

  return Effect.gen(function*() {
    const store = yield* KeyValueStore.KeyValueStore
    const result = yield* Effect.result(store.set("key", "value"))
    yield* Effect.yieldNow
    assert.isTrue(Result.isFailure(result), "the aborted transaction was reported as successful")
  }).pipe(Effect.provide(layer))
})
