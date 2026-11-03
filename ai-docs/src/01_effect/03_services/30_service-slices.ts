/**
 * @title Service slices
 *
 * Depend on individual members of a service with `Service.only`, and implement
 * each member in its own module with `Layer.succeedOnly` or `Layer.effectOnly`.
 * The composition root then imports only the member implementations the
 * program requires, so a bundler drops the rest. This matters for cold start on
 * platforms like Cloudflare Workers: a bundler cannot remove properties from a
 * service object, but it can remove modules that are never imported.
 */
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"
import { Bucket } from "./fixtures/storage/Bucket.ts"
import { StorageGetLayer } from "./fixtures/storage/get.ts"
import { StoragePutLayer } from "./fixtures/storage/put.ts"
import { Storage } from "./fixtures/storage/Storage.ts"

// The file layout that makes tree-shaking work:
//
//   src/storage/Storage.ts   the contract: a Context.Service with no implementation
//   src/storage/Bucket.ts    the shared platform binding every member uses
//   src/storage/get.ts       Layer.effectOnly(Storage, "get", ...)
//   src/storage/put.ts       Layer.effectOnly(Storage, "put", ...)
//   src/storage/list.ts      Layer.effectOnly(Storage, "list", ...)
//
// Requirements:
//
// - One member per module. A module that implements two members is loaded
//   whenever either of them is needed.
// - No aggregate object of implementations, and no `Storage.layer` that
//   references every member. A bundler keeps every property of an object it
//   keeps.
// - Access members with `Storage.only(...)`. A `yield* Storage` anywhere in the
//   program requires the full service, which forces the root to provide every
//   member.

// `Storage.only` returns the requested members and requires only their slices,
// so the requirements of this program are
// `Context.Only<Storage, "get"> | Context.Only<Storage, "put">`.
export const copyKey = Effect.fn("copyKey")(function*(from: string, to: string) {
  const { get, put } = yield* Storage.only("get", "put")
  const value = yield* get(from)
  if (Option.isSome(value)) {
    yield* put(to, value.value)
  }
  return Option.isSome(value)
})

// In a Worker the binding comes from the environment, for example
// `Layer.succeed(Bucket, env.MY_BUCKET)` inside the fetch handler. An in-memory
// bucket keeps this example runnable.
const BucketLayer = Layer.sync(Bucket, () => {
  const objects = new Map<string, string>([["greeting", "hello"]])
  return {
    get: (key) => Promise.resolve(objects.get(key) ?? null),
    put: (key, value) => {
      objects.set(key, value)
      return Promise.resolve()
    },
    list: ({ prefix }) =>
      Promise.resolve(
        Array.from(objects.keys(), (key) => ({ key })).filter((object) => object.key.startsWith(prefix))
      )
  }
})

// The composition root imports only the member modules the program needs.
// `src/storage/list.ts` is never imported, so it is not in the bundle. Leaving
// out a member the program uses is a type error that names the missing slice,
// for example `Context.Only<Storage, "put">`.
export const StorageLayer = Layer.mergeAll(StorageGetLayer, StoragePutLayer).pipe(
  Layer.provide(BucketLayer)
)

export const program = copyKey("greeting", "greeting-copy").pipe(
  Effect.provide(StorageLayer)
)

// Tests override a single member by providing its slice on top of the real
// layers. A slice always wins over the full service and over an earlier slice,
// so nothing else about the storage setup changes.
it.effect("copies a key when the source exists", () =>
  Effect.gen(function*() {
    const copied = yield* copyKey("missing", "copy")
    assert.isTrue(copied)
  }).pipe(
    Effect.provide(Layer.succeedOnly(Storage, "get", () => Effect.succeed(Option.some("stubbed")))),
    Effect.provide(StorageLayer)
  ))
