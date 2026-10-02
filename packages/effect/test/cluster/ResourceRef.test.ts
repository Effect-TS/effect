import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Scope } from "effect"
import { EntityAddress, EntityId, EntityType, ShardId } from "effect/cluster"
import { isActive } from "effect/cluster/internal/interruptors"
import { ResourceRef } from "effect/cluster/internal/resourceRef"

// Acquires 1, 2, 3, ... An acquisition listed in `gated` waits until its gate
// is released.
const makeAcquire = Effect.fnUntraced(function*(...gated: Array<number>) {
  let acquisitions = 0
  let releases = 0
  const gates = new Map<
    number,
    { readonly acquiring: Deferred.Deferred<void>; readonly release: Deferred.Deferred<void> }
  >()
  for (const acquisition of gated) {
    gates.set(acquisition, { acquiring: yield* Deferred.make<void>(), release: yield* Deferred.make<void>() })
  }
  const acquire = (scope: Scope.Scope) =>
    Effect.gen(function*() {
      const acquisition = ++acquisitions
      yield* Scope.addFinalizer(scope, Effect.sync(() => releases++))
      const gate = gates.get(acquisition)
      if (gate) {
        yield* Deferred.succeed(gate.acquiring, void 0)
        yield* Deferred.await(gate.release)
      }
      return acquisition
    })
  return {
    acquire,
    gate: (acquisition: number) => gates.get(acquisition)!,
    acquisitions: () => acquisitions,
    releases: () => releases
  } as const
})

// Lets forked fibers run until they block.
const settle = Effect.gen(function*() {
  for (let i = 0; i < 10; i++) yield* Effect.yieldNow
})

it.effect("rebuilds only the current generation", () =>
  Effect.gen(function*() {
    const parentScope = yield* Scope.make()
    const { acquire } = yield* makeAcquire()
    const ref = yield* ResourceRef.from(parentScope, acquire)
    assert.strictEqual(ref.getUnsafe(), 1)

    yield* ref.rebuildUnsafe({ from: 1 })!
    assert.strictEqual(ref.getUnsafe(), 2)
    // A replaced value can never replace its successor.
    assert.isUndefined(ref.rebuildUnsafe({ from: 1 }))

    // Without `from`, an idle ref is rebuilt.
    yield* ref.rebuildUnsafe()!
    assert.strictEqual(ref.getUnsafe(), 3)
    assert.isUndefined(ref.rebuildUnsafe({ from: 2 }))

    yield* Scope.close(parentScope, Exit.void)
    assert.isUndefined(ref.getUnsafe())
    assert.isUndefined(ref.rebuildUnsafe({ from: 3 }))
    assert.isUndefined(ref.rebuildUnsafe())
    assert.isTrue(Exit.hasInterrupts(yield* Effect.exit(ref.await)))
  }))

it.effect("refuses a second rebuild of a generation without disturbing the accepted one", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const { acquire, gate } = yield* makeAcquire(2)
    const ref = yield* ResourceRef.from(parentScope, acquire)

    const accepted = ref.rebuildUnsafe({ from: 1 })
    assert.isDefined(accepted)
    // Admission closes as soon as the rebuild is accepted, before it runs.
    assert.isUndefined(ref.getUnsafe())
    assert.isUndefined(ref.rebuildUnsafe({ from: 1 }))
    assert.isUndefined(ref.rebuildUnsafe())

    const rebuild = yield* Effect.forkChild(accepted!)
    yield* Deferred.await(gate(2).acquiring)
    assert.isUndefined(ref.rebuildUnsafe({ from: 1 }))
    assert.isUndefined(ref.rebuildUnsafe())

    yield* Deferred.succeed(gate(2).release, void 0)
    assert.deepStrictEqual(yield* Fiber.await(rebuild), Exit.void)
    assert.strictEqual(ref.getUnsafe(), 2)
    assert.strictEqual(yield* ref.await, 2)
  })))

it.effect("admits waiters after prepare completes", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const { acquire } = yield* makeAcquire()
    const preparing = yield* Deferred.make<number>()
    const prepared = yield* Deferred.make<void>()
    const ref = yield* ResourceRef.from(parentScope, acquire)

    const rebuild = yield* Effect.forkChild(
      ref.rebuildUnsafe({
        from: 1,
        prepare: (value) => Deferred.succeed(preparing, value).pipe(Effect.andThen(Deferred.await(prepared)))
      })!
    )
    assert.strictEqual(yield* Deferred.await(preparing), 2)
    const waiter = yield* Effect.forkChild(ref.await)
    yield* Effect.yieldNow
    assert.isUndefined(ref.getUnsafe())
    assert.isUndefined(waiter.pollUnsafe())
    // Only the value being prepared can replace it.
    assert.isUndefined(ref.rebuildUnsafe())
    assert.isUndefined(ref.rebuildUnsafe({ from: 1 }))

    yield* Deferred.succeed(prepared, void 0)
    assert.deepStrictEqual(yield* Fiber.await(rebuild), Exit.void)
    assert.strictEqual(yield* Fiber.join(waiter), 2)
    assert.strictEqual(ref.getUnsafe(), 2)
  })))

it.effect("interrupts prepare when its generation is replaced", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const { acquire } = yield* makeAcquire()
    const ref = yield* ResourceRef.from(parentScope, acquire)
    let newer: Effect.Effect<void> | undefined
    let finishedPreparing = false

    const superseded = yield* Effect.forkChild(
      ref.rebuildUnsafe({
        from: 1,
        // Replaces the value being prepared, as a replayed request that defects does.
        prepare: (value) =>
          Effect.gen(function*() {
            newer = ref.rebuildUnsafe({ from: value })
            yield* Effect.yieldNow
            finishedPreparing = true
          })
      })!
    )
    assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(superseded)))
    assert.isFalse(finishedPreparing, "prepare must be interrupted")
    assert.isDefined(newer)

    // The superseded value is never admitted.
    const waiter = yield* Effect.forkChild(ref.await)
    yield* Effect.yieldNow
    assert.isUndefined(ref.getUnsafe())
    assert.isUndefined(waiter.pollUnsafe())

    yield* newer!
    assert.strictEqual(yield* Fiber.join(waiter), 3)
    assert.strictEqual(ref.getUnsafe(), 3)
  })))

it.effect("releases waiters when a rebuild is interrupted and accepts the next rebuild", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const { acquire, gate, releases } = yield* makeAcquire(2)
    const ref = yield* ResourceRef.from(parentScope, acquire)

    const rebuild = yield* Effect.forkChild(ref.rebuildUnsafe({ from: 1 })!)
    yield* Deferred.await(gate(2).acquiring)
    const waiter = yield* Effect.forkChild(ref.await)
    yield* Effect.yieldNow
    assert.isUndefined(waiter.pollUnsafe())

    yield* Fiber.interrupt(rebuild)
    // Both the replaced generation and the abandoned one are closed.
    assert.strictEqual(releases(), 2)
    assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(waiter)))
    assert.isUndefined(ref.getUnsafe())

    const recovery = ref.rebuildUnsafe()
    assert.isDefined(recovery, "an interrupted rebuild must not block the next one")
    yield* recovery!
    assert.strictEqual(ref.getUnsafe(), 3)
    assert.strictEqual(yield* ref.await, 3)
  })))

it.effect("closes a replaced generation whose rebuild never ran when the ref closes", () =>
  Effect.gen(function*() {
    const parentScope = yield* Scope.make()
    const { acquire, acquisitions, releases } = yield* makeAcquire()
    const ref = yield* ResourceRef.from(parentScope, acquire)

    const rebuild = ref.rebuildUnsafe({ from: 1 })
    assert.isDefined(rebuild)
    const waiter = yield* Effect.forkChild(ref.await)
    yield* Effect.yieldNow

    yield* Scope.close(parentScope, Exit.void)
    assert.strictEqual(releases(), 1, "the replaced generation must be closed")
    assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(waiter)))

    // Running the abandoned rebuild afterwards acquires nothing.
    assert.isTrue(Exit.hasInterrupts(yield* Effect.exit(rebuild!)))
    assert.strictEqual(acquisitions(), 1)
  }))

it.effect("does not leak teardown membership when a rebuild is discarded", () =>
  Effect.gen(function*() {
    const parentScope = yield* Scope.make()
    const address = EntityAddress.make({
      shardId: ShardId.make("resource-ref-discard", 1),
      entityType: EntityType.make("ResourceRefDiscard"),
      entityId: EntityId.make("1")
    })
    const { acquire } = yield* makeAcquire()
    const ref = yield* ResourceRef.from(parentScope, acquire, address)
    assert.isDefined(ref.rebuildUnsafe({ from: 1 }))
    assert.isFalse(isActive(address))
    yield* Scope.close(parentScope, Exit.void)
    assert.isFalse(isActive(address))
  }))

it.effect("does not leak teardown membership when a rebuild is interrupted", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const address = EntityAddress.make({
      shardId: ShardId.make("resource-ref-interrupt", 1),
      entityType: EntityType.make("ResourceRefInterrupt"),
      entityId: EntityId.make("1")
    })
    const release = yield* Deferred.make<void>()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(
      parentScope,
      (scope) =>
        Scope.addFinalizer(scope, Deferred.await(release)).pipe(
          Effect.andThen(Effect.sync(() => ++acquisitions))
        ),
      address
    )
    const fiber = yield* Effect.forkChild(ref.rebuildUnsafe({ from: 1 })!)
    yield* Fiber.interrupt(fiber)
    yield* Deferred.succeed(release, void 0)
    assert.isFalse(isActive(address))
  })))

it.effect("stays rebuildable when a failed replacement cannot be released", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const acquiring = yield* Deferred.make<void>()
    const released = yield* Deferred.make<void>()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(parentScope, (scope) =>
      Effect.gen(function*() {
        if (++acquisitions !== 2) return acquisitions
        // Holds something whose release hangs, then never finishes acquiring.
        yield* Scope.addFinalizer(scope, Deferred.await(released))
        yield* Deferred.succeed(acquiring, void 0)
        return yield* Effect.never
      }))

    yield* Effect.gen(function*() {
      const rebuild = yield* Effect.forkChild(ref.rebuildUnsafe({ from: 1 })!)
      yield* Deferred.await(acquiring)
      // A deadline abandons the rebuild, whose replacement then cannot be released.
      rebuild.interruptUnsafe()
      yield* settle
      assert.isDefined(ref.rebuildUnsafe(), "a hung release must not block the next rebuild")
    }).pipe(Effect.ensuring(Deferred.succeed(released, void 0)))
  })))

it.effect("interrupts a rebuild that is preparing when the ref closes", () =>
  Effect.gen(function*() {
    const parentScope = yield* Scope.make()
    const { acquire } = yield* makeAcquire()
    const preparing = yield* Deferred.make<void>()
    const prepared = yield* Deferred.make<void>()
    let ranAfterClose = false
    const ref = yield* ResourceRef.from(parentScope, acquire)

    const rebuild = yield* Effect.forkChild(
      ref.rebuildUnsafe({
        from: 1,
        prepare: () =>
          Deferred.succeed(preparing, void 0).pipe(
            Effect.andThen(Deferred.await(prepared)),
            Effect.andThen(Effect.sync(() => {
              ranAfterClose = true
            }))
          )
      })!
    )
    yield* Deferred.await(preparing)
    yield* Scope.close(parentScope, Exit.void)
    yield* settle
    const exit = rebuild.pollUnsafe()
    assert.isDefined(exit, "closing the ref must interrupt prepare")
    assert.isTrue(Exit.hasInterrupts(exit))

    yield* Deferred.succeed(prepared, void 0)
    yield* settle
    assert.isFalse(ranAfterClose)
  }))

it.effect("interrupts a rebuild that is acquiring when the ref closes", () =>
  Effect.gen(function*() {
    const parentScope = yield* Scope.make()
    const acquiring = yield* Deferred.make<void>()
    const acquired = yield* Deferred.make<void>()
    let acquisitions = 0
    let ranAfterClose = false
    const ref = yield* ResourceRef.from(parentScope, () =>
      Effect.gen(function*() {
        if (++acquisitions !== 2) return acquisitions
        yield* Deferred.succeed(acquiring, void 0)
        yield* Deferred.await(acquired)
        ranAfterClose = true
        return acquisitions
      }))

    const rebuild = yield* Effect.forkChild(ref.rebuildUnsafe({ from: 1 })!)
    yield* Deferred.await(acquiring)
    const waiter = yield* Effect.forkChild(ref.await)
    yield* Scope.close(parentScope, Exit.void)
    yield* settle
    const exit = rebuild.pollUnsafe()
    assert.isDefined(exit, "closing the ref must interrupt acquisition")
    assert.isTrue(Exit.hasInterrupts(exit))
    assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(waiter)))

    yield* Deferred.succeed(acquired, void 0)
    yield* settle
    assert.isFalse(ranAfterClose)
  }))

it.effect("interrupts handed-over waiters when the ref closes", () =>
  Effect.gen(function*() {
    const parentScope = yield* Scope.make()
    const releasing = yield* Deferred.make<void>()
    const released = yield* Deferred.make<void>()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(parentScope, (scope) =>
      Effect.gen(function*() {
        // Releasing the first generation stalls.
        if (++acquisitions === 1) {
          yield* Scope.addFinalizer(
            scope,
            Deferred.succeed(releasing, void 0).pipe(Effect.andThen(Deferred.await(released)))
          )
        }
        return acquisitions
      }))

    const rebuild = yield* Effect.forkChild(ref.rebuildUnsafe({ from: 1 })!)
    yield* Deferred.await(releasing)
    const waiter = yield* Effect.forkChild(ref.await)
    yield* settle
    yield* Fiber.interrupt(rebuild)

    // The stalled release must not hold waiters past the close.
    const close = yield* Effect.forkChild(Scope.close(parentScope, Exit.void))
    yield* settle
    const exit = waiter.pollUnsafe()
    yield* Deferred.succeed(released, void 0)
    yield* Fiber.join(close)
    assert.isDefined(exit, "closing the ref must wake waiters without waiting for the stalled release")
    assert.isTrue(Exit.hasInterrupts(exit))
  }))
