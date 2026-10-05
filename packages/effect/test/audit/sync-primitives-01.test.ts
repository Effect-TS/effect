import { assert, it } from "@effect/vitest"
import { Effect, Exit, Fiber, FiberHandle, Scope } from "effect"

// FiberHandle.setUnsafe (src/FiberHandle.ts:341-345) interrupts the previous fiber before installing the
// replacement. Its JSDoc (FiberHandle.ts:275) says replaced fibers are interrupted, and a handle's fibers must
// be interrupted when its scope closes, so a fiber started by the previous fiber's finalizer must stay owned.
it.effect("FiberHandle retains ownership of a replacement made by a synchronous finalizer", () =>
  Effect.gen(function*() {
    const scope = yield* Scope.make()
    const handle = yield* FiberHandle.make().pipe(Scope.provide(scope))
    const run = yield* FiberHandle.runtime(handle)()
    let nested: Fiber.Fiber<unknown, unknown> | undefined
    const previous = run(Effect.never.pipe(Effect.ensuring(Effect.sync(() => {
      nested = run(Effect.never)
    }))))
    const replacement = run(Effect.never)

    yield* Scope.close(scope, Exit.void)
    const nestedDone = nested!.pollUnsafe() !== undefined
    yield* Fiber.interrupt(nested!)

    assert.isDefined(previous.pollUnsafe())
    assert.isDefined(replacement.pollUnsafe())
    assert.isTrue(nestedDone, "fiber started by the finalizer still running after scope close")
  }))
