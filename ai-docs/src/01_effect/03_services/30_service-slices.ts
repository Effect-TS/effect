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
import { BucketMemoryLayer } from "./fixtures/storage/BucketMemory.ts"
import { copyKey } from "./fixtures/storage/copyKey.ts"
import { Storage } from "./fixtures/storage/Storage.ts"
import { StorageLayer } from "./fixtures/worker.ts"

// The file layout that makes tree-shaking work (see `fixtures/`):
//
//   src/storage/Storage.ts   the contract: a Context.Service with no implementation
//   src/storage/Bucket.ts    the shared platform binding every member uses
//   src/storage/get.ts       Layer.effectOnly(Storage, ["get"], ...)
//   src/storage/put.ts       Layer.effectOnly(Storage, ["put"], ...)
//   src/storage/list.ts      Layer.effectOnly(Storage, ["list"], ...)
//   src/storage/copyKey.ts   a program that uses Storage.only("get", "put")
//   src/worker.ts            the production root: imports get.ts and put.ts only
//   test/storage/BucketMemory.ts   an in-memory Bucket, imported by tests only
//
// Requirements:
//
// - One member per module. A module that implements two members is loaded
//   whenever either of them is needed. `Layer.succeedOnly` and
//   `Layer.effectOnly` accept several members for the cases where they share
//   state, at the cost of loading them together.
// - No aggregate object of implementations, and no `Storage.layer` that
//   references every member. A bundler keeps every property of an object it
//   keeps.
// - Access members with `Storage.only(...)`. A `yield* Storage` anywhere in the
//   program requires the full service, which forces the root to provide every
//   member.
// - Keep tests and in-memory implementations out of the production root's
//   import graph, as this file does by living next to the root instead of
//   inside it.

// Tests override a single member by providing its slice on top of the
// production layers. A slice always wins over the full service and over an
// earlier slice, so nothing else about the storage setup changes.
it.effect("copies a key when the source exists", () =>
  Effect.gen(function*() {
    const copied = yield* copyKey("missing", "copy")
    assert.isTrue(copied)
  }).pipe(
    Effect.provide(Layer.succeedOnly(Storage, ["get"], { get: () => Effect.succeed(Option.some("stubbed")) })),
    Effect.provide(StorageLayer),
    Effect.provide(BucketMemoryLayer)
  ))
