/**
 * @title Overridable operations
 *
 * Define each operation of a service as a module-level `Context.overridable`
 * with a default implementation, instead of as a property of one service
 * object. Programs import and call the operations they use, and a bundler
 * drops the modules nobody imports. This matters for cold start on platforms
 * like Cloudflare Workers: a bundler cannot remove properties from a service
 * object, but it can remove modules that are never imported. The
 * implementation can still be swapped in tests or at the composition root
 * through `operation.reference`.
 */
import { assert, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { BucketMemoryLayer } from "./fixtures/storage/BucketMemory.ts"
import { copyKey } from "./fixtures/storage/copyKey.ts"
import { get } from "./fixtures/storage/get.ts"

// The file layout that makes tree-shaking work (see `fixtures/`):
//
//   src/storage/Bucket.ts    the shared platform binding every operation uses
//   src/storage/get.ts       Context.overridable("myapp/storage/get", ...)
//   src/storage/put.ts       Context.overridable("myapp/storage/put", ...)
//   src/storage/list.ts      Context.overridable("myapp/storage/list", ...)
//   src/storage/copyKey.ts   a program that calls get and put
//   src/worker.ts            the production root: imports copyKey only
//   test/storage/BucketMemory.ts   an in-memory Bucket, imported by tests only
//
// Requirements:
//
// - One operation per module. A module that defines two operations is loaded
//   whenever either of them is needed.
// - No aggregate object of operations. A bundler keeps every property of an
//   object it keeps.
// - Call operations directly, as `copyKey` does with `get(from)`. The current
//   implementation is looked up when the call runs, not when it is made, so
//   overrides provided later still apply.
// - Keep tests and in-memory implementations out of the production root's
//   import graph, as this file does by living next to the root instead of
//   inside it.
//
// Trade-offs to be aware of:
//
// - A forgotten override silently runs the default. Nothing about an
//   overridable appears in `R`, so the type checker cannot flag a program that
//   is still using the default implementation.
// - Every overridable needs a default. To pick an implementation per platform,
//   make the default depend on a service through its own `R`, as the storage
//   operations do with `Bucket`.

// Tests override a single operation with `Effect.provideService` on its
// reference, on top of the in-memory platform binding. Nothing else about the
// storage setup changes, and the override has the same type as the default.
it.effect("copies a key when the source exists", () =>
  Effect.gen(function*() {
    const copied = yield* copyKey("missing", "copy")
    assert.isTrue(copied)
  }).pipe(
    Effect.provideService(get.reference, () => Effect.succeed(Option.some("stubbed"))),
    Effect.provide(BucketMemoryLayer)
  ))
