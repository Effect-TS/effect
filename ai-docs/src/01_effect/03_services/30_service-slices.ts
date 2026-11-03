/**
 * @title Service slices
 *
 * Depend on individual members of a service with `Service.only`, which returns
 * a key for one member, and implement each member in its own module with
 * `Layer.succeed` or `Layer.effect` on that key. The composition root then
 * imports only the member implementations the program requires, so a bundler
 * drops the rest. This matters for cold start on
 * platforms like Cloudflare Workers: a bundler cannot remove properties from a
 * service object, but it can remove modules that are never imported.
 */
import { assert, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { BucketMemoryLayer } from "./fixtures/storage/BucketMemory.ts"
import { copyKey } from "./fixtures/storage/copyKey.ts"
import { Storage } from "./fixtures/storage/Storage.ts"
import { StorageLayer } from "./fixtures/worker.ts"

// The file layout that makes tree-shaking work (see `fixtures/`):
//
//   src/storage/Storage.ts   the contract: a Context.Service with no implementation
//   src/storage/Bucket.ts    the shared platform binding every member uses
//   src/storage/get.ts       Layer.effect(Storage.only("get"), ...)
//   src/storage/put.ts       Layer.effect(Storage.only("put"), ...)
//   src/storage/list.ts      Layer.effect(Storage.only("list"), ...)
//   src/storage/copyKey.ts   a program that yields Storage.only("get") and Storage.only("put")
//   src/worker.ts            the production root: imports get.ts and put.ts only
//   test/storage/BucketMemory.ts   an in-memory Bucket, imported by tests only
//
// Requirements:
//
// - One member per module. A module that implements two members is loaded
//   whenever either of them is needed.
// - No aggregate object of implementations, and no `Storage.layer` that
//   references every member. A bundler keeps every property of an object it
//   keeps.
// - Access members by yielding `Storage.only(member)`. A `yield* Storage`
//   anywhere in the program requires the full service, which forces the root to
//   provide every member.
// - Keep tests and in-memory implementations out of the production root's
//   import graph, as this file does by living next to the root instead of
//   inside it.
// - Slices are stored under `<service key>#<member>`, so `#` in a service key
//   is reserved for slices.

// Tests override a single member with `Effect.provideService` on its key, on
// top of the production layers. A slice always wins over the full service and
// over an earlier slice, so nothing else about the storage setup changes.
it.effect("copies a key when the source exists", () =>
  Effect.gen(function*() {
    const copied = yield* copyKey("missing", "copy")
    assert.isTrue(copied)
  }).pipe(
    Effect.provideService(Storage.only("get"), () => Effect.succeed(Option.some("stubbed"))),
    Effect.provide(StorageLayer),
    Effect.provide(BucketMemoryLayer)
  ))
