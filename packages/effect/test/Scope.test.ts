import { assert, describe, expect, it } from "@effect/vitest"
import { Deferred, Duration, Effect, Exit, Fiber, Scope } from "effect"
import { TestClock } from "effect/testing"

describe("Scope", () => {
  describe("isOpen / isClosed", () => {
    it.effect("an empty scope is open until closed", () =>
      Effect.gen(function*() {
        const scope = yield* Scope.make()

        assert.isTrue(Scope.isOpen(scope))
        assert.isFalse(Scope.isClosed(scope))

        yield* Scope.close(scope, Exit.void)

        assert.isFalse(Scope.isOpen(scope))
        assert.isTrue(Scope.isClosed(scope))
      }))

    it.effect("a scope with finalizers is open until closed", () =>
      Effect.gen(function*() {
        const scope = yield* Scope.make()
        yield* Scope.addFinalizer(scope, Effect.void)

        assert.isTrue(Scope.isOpen(scope))
        assert.isFalse(Scope.isClosed(scope))

        yield* Scope.close(scope, Exit.void)

        assert.isFalse(Scope.isOpen(scope))
        assert.isTrue(Scope.isClosed(scope))
      }))

    it.effect("closure starts before finalizers finish", () =>
      Effect.gen(function*() {
        const scope = yield* Scope.make()
        const started = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        yield* Scope.addFinalizer(
          scope,
          Effect.andThen(Deferred.succeed(started, undefined), Deferred.await(release))
        )

        const closing = yield* Effect.forkChild(Scope.close(scope, Exit.void))
        yield* Deferred.await(started)

        assert.isFalse(Scope.isOpen(scope))
        assert.isTrue(Scope.isClosed(scope))
        assert.isUndefined(closing.pollUnsafe())

        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(closing)

        assert.isFalse(Scope.isOpen(scope))
        assert.isTrue(Scope.isClosed(scope))
      }))

    it.effect("a child forked from a closed scope is closed", () =>
      Effect.gen(function*() {
        const parent = yield* Scope.make()
        yield* Scope.close(parent, Exit.void)
        const child = yield* Scope.fork(parent)

        assert.isFalse(Scope.isOpen(child))
        assert.isTrue(Scope.isClosed(child))
      }))
  })

  describe("parallel finalization", () => {
    it.effect("executes finalizers in parallel", () =>
      Effect.gen(function*() {
        const scope = Scope.makeUnsafe("parallel")
        yield* Scope.addFinalizer(scope, Effect.sleep(Duration.seconds(1)))
        yield* Scope.addFinalizer(scope, Effect.sleep(Duration.seconds(1)))
        yield* Scope.addFinalizer(scope, Effect.sleep(Duration.seconds(1)))
        const fiber = yield* Effect.forkChild(Scope.close(scope, Exit.void), { startImmediately: true })
        expect(fiber.pollUnsafe()).toBeUndefined()
        yield* TestClock.adjust(Duration.seconds(1))
        expect(fiber.pollUnsafe()).toBeDefined()
      }))
  })
})
