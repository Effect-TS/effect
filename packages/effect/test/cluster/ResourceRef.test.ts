import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Option, Scope } from "effect"
import { EntityAddress, EntityId, EntityType, ShardId } from "effect/cluster"
import { isActive } from "effect/cluster/internal/interruptors"
import { ResourceRef } from "effect/cluster/internal/resourceRef"

it.live("does not wedge await after a failed rebuild", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    let fail = false
    let releases = 0
    const ref = yield* ResourceRef.from(parentScope, (scope) =>
      Scope.addFinalizer(
        scope,
        Effect.sync(() => releases++)
      ).pipe(
        Effect.andThen(fail ? Effect.fail("failed") : Effect.succeed(1))
      ))
    fail = true
    assert.deepStrictEqual(yield* Effect.exit(ref.rebuildUnsafe()), Exit.fail("failed"))
    assert.strictEqual(releases, 2)
    const completed = yield* Effect.exit(ref.await).pipe(Effect.timeoutOption(10))
    assert.deepStrictEqual(completed, Option.some(Exit.fail("failed")))
    fail = false
    yield* ref.rebuildUnsafe()
    assert.strictEqual(yield* ref.await, 1)
  })))

it.effect("does not let a stale rebuild overwrite a newer acquisition", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const releasing = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const newerAcquiring = yield* Deferred.make<void>()
    const newerAcquire = yield* Deferred.make<void>()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(parentScope, (scope) =>
      Effect.gen(function*() {
        const acquisition = ++acquisitions
        if (acquisition === 1) {
          yield* Scope.addFinalizer(
            scope,
            Deferred.succeed(releasing, void 0).pipe(Effect.andThen(Deferred.await(release)))
          )
        } else if (acquisition === 2) {
          yield* Deferred.succeed(newerAcquiring, void 0)
          yield* Deferred.await(newerAcquire)
        } else {
          return yield* Effect.fail("stale")
        }
        return acquisition
      }))

    const staleRebuild = yield* Effect.forkChild(ref.rebuildUnsafe())
    yield* Deferred.await(releasing)
    const newerRebuild = yield* Effect.forkChild(ref.rebuildUnsafe())
    yield* Deferred.await(newerAcquiring)

    yield* Deferred.succeed(release, void 0)
    assert.deepStrictEqual(yield* Fiber.await(staleRebuild), Exit.fail("stale"))
    assert.strictEqual(ref.state.current._tag, "Acquiring")
    assert.isFalse(ref.latch.isOpen())

    yield* Deferred.succeed(newerAcquire, void 0)
    yield* Fiber.join(newerRebuild)
    assert.strictEqual(yield* ref.await, 2)
  })))

it.effect("does not leak teardown membership when a rebuild is discarded", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const address = EntityAddress.make({
      shardId: ShardId.make("resource-ref-discard", 1),
      entityType: EntityType.make("ResourceRefDiscard"),
      entityId: EntityId.make("1")
    })
    const ref = yield* ResourceRef.from(parentScope, () => Effect.succeed(1), address)
    const discarded = ref.rebuildUnsafe()
    assert.isDefined(discarded)
    assert.isFalse(isActive(address))
    yield* ref.rebuildUnsafe()
    assert.isFalse(isActive(address))
    assert.strictEqual(yield* ref.await, 1)
  })))

it.effect("does not leak teardown membership when a rebuild is interrupted", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const address = EntityAddress.make({
      shardId: ShardId.make("resource-ref-interrupt", 1),
      entityType: EntityType.make("ResourceRefInterrupt"),
      entityId: EntityId.make("1")
    })
    const release = yield* Deferred.make<void>()
    const ref = yield* ResourceRef.from(
      parentScope,
      (scope) =>
        Scope.addFinalizer(scope, Deferred.await(release)).pipe(
          Effect.andThen(Effect.succeed(1))
        ),
      address
    )
    const fiber = yield* Effect.forkChild(ref.rebuildUnsafe())
    yield* Fiber.interrupt(fiber)
    yield* Deferred.succeed(release, void 0)
    assert.isFalse(isActive(address))
  })))

it.effect("does not publish a rebuild superseded by a newer rebuild", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const staleAcquiring = yield* Deferred.make<void>()
    const staleAcquire = yield* Deferred.make<void>()
    const newerAcquiring = yield* Deferred.make<void>()
    const newerAcquire = yield* Deferred.make<void>()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(parentScope, () =>
      Effect.gen(function*() {
        const acquisition = ++acquisitions
        if (acquisition === 2) {
          yield* Deferred.succeed(staleAcquiring, void 0)
          yield* Deferred.await(staleAcquire)
        } else if (acquisition === 3) {
          yield* Deferred.succeed(newerAcquiring, void 0)
          yield* Deferred.await(newerAcquire)
        }
        return acquisition
      }))

    const staleRebuild = yield* Effect.forkChild(ref.rebuildUnsafe())
    yield* Deferred.await(staleAcquiring)
    const newerRebuild = yield* Effect.forkChild(ref.rebuildUnsafe())
    yield* Deferred.await(newerAcquiring)

    // The superseded acquisition completes first. It must not become visible.
    yield* Deferred.succeed(staleAcquire, void 0)
    const staleExit = yield* Fiber.await(staleRebuild)
    assert.isTrue(Exit.isFailure(staleExit), "a superseded rebuild must not succeed")
    assert.strictEqual(ref.state.current._tag, "Acquiring")
    assert.deepStrictEqual(ref.getUnsafe(), Option.none())
    assert.isFalse(ref.latch.isOpen())

    yield* Deferred.succeed(newerAcquire, void 0)
    assert.strictEqual(yield* Fiber.join(newerRebuild), 3)
    assert.strictEqual(yield* ref.await, 3)
  })))

it.effect("wakes waiters when closed during a rebuild", () =>
  Effect.gen(function*() {
    const parentScope = yield* Scope.make()
    const acquiring = yield* Deferred.make<void>()
    const acquire = yield* Deferred.make<void>()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(parentScope, () =>
      Effect.gen(function*() {
        if (++acquisitions === 2) {
          yield* Deferred.succeed(acquiring, void 0)
          yield* Deferred.await(acquire)
        }
        return acquisitions
      }))

    yield* Effect.forkChild(ref.rebuildUnsafe())
    yield* Deferred.await(acquiring)
    const waiter = yield* Effect.forkChild(ref.await)
    yield* Effect.yieldNow
    assert.isUndefined(waiter.pollUnsafe())

    yield* Scope.close(parentScope, Exit.void)
    yield* Effect.yieldNow
    const exit = waiter.pollUnsafe()
    assert.isDefined(exit, "closing the ref must wake waiters")
    assert.isTrue(Exit.hasInterrupts(exit))
    yield* Deferred.succeed(acquire, void 0)
  }))

it.effect("only rebuilds the current generation", () =>
  Effect.gen(function*() {
    const parentScope = yield* Scope.make()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(parentScope, () => Effect.sync(() => ++acquisitions))
    const first = ref.scopeUnsafe()!

    const rebuild = ref.rebuildUnsafe({ from: first })
    assert.isDefined(rebuild)
    // The generation is already being replaced.
    assert.isUndefined(ref.rebuildUnsafe({ from: first }))
    assert.strictEqual(yield* rebuild!, 2)
    assert.isUndefined(ref.rebuildUnsafe({ from: first }))

    const second = ref.scopeUnsafe()!
    assert.notStrictEqual(second, first)
    assert.strictEqual(yield* ref.rebuildUnsafe({ from: second })!, 3)

    const third = ref.scopeUnsafe()!
    yield* Scope.close(parentScope, Exit.void)
    assert.isUndefined(ref.scopeUnsafe())
    assert.isUndefined(ref.rebuildUnsafe({ from: third }))
  }))

it.effect("admits waiters after onAcquired completes", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const preparing = yield* Deferred.make<number>()
    const prepared = yield* Deferred.make<void>()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(parentScope, () => Effect.sync(() => ++acquisitions))

    const rebuild = yield* Effect.forkChild(
      ref.rebuildUnsafe({
        from: ref.scopeUnsafe()!,
        onAcquired: (value) => Deferred.succeed(preparing, value).pipe(Effect.andThen(Deferred.await(prepared)))
      })!
    )
    assert.strictEqual(yield* Deferred.await(preparing), 2)
    const waiter = yield* Effect.forkChild(ref.await)
    yield* Effect.yieldNow

    // Published, but not yet ready for use.
    assert.strictEqual(ref.state.current._tag, "Acquired")
    assert.deepStrictEqual(ref.getUnsafe(), Option.none())
    assert.isUndefined(waiter.pollUnsafe())

    yield* Deferred.succeed(prepared, void 0)
    assert.strictEqual(yield* Fiber.join(rebuild), 2)
    assert.strictEqual(yield* Fiber.join(waiter), 2)
    assert.deepStrictEqual(ref.getUnsafe(), Option.some(2))
  })))

it.effect("leaves admission to a rebuild started from onAcquired", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const newerAcquiring = yield* Deferred.make<void>()
    const newerAcquire = yield* Deferred.make<void>()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(parentScope, () =>
      Effect.gen(function*() {
        const acquisition = ++acquisitions
        if (acquisition === 3) {
          yield* Deferred.succeed(newerAcquiring, void 0)
          yield* Deferred.await(newerAcquire)
        }
        return acquisition
      }))

    let newerRebuild: Fiber.Fiber<number> | undefined
    const rebuild = ref.rebuildUnsafe({
      from: ref.scopeUnsafe()!,
      // Replaces the generation being prepared, as a defect during replay does.
      onAcquired: () =>
        Effect.gen(function*() {
          newerRebuild = yield* Effect.forkChild(ref.rebuildUnsafe({ from: ref.scopeUnsafe()! })!)
          yield* Deferred.await(newerAcquiring)
        })
    })!
    assert.strictEqual(yield* rebuild, 2)

    const waiter = yield* Effect.forkChild(ref.await)
    yield* Effect.yieldNow
    assert.isFalse(ref.latch.isOpen(), "the superseded rebuild must not admit waiters")
    assert.isUndefined(waiter.pollUnsafe())

    yield* Deferred.succeed(newerAcquire, void 0)
    assert.strictEqual(yield* Fiber.join(newerRebuild!), 3)
    assert.strictEqual(yield* Fiber.join(waiter), 3)
  })))
