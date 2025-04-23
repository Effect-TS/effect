import { strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Scope from "effect/Scope"

export interface ObservableResource<E, V> {
  readonly scoped: Effect.Effect<V, E, Scope.Scope>
  assertNotAcquired(): Effect.Effect<void>
  assertAcquiredOnceAndCleaned(): Effect.Effect<void>
  assertAcquiredOnceAndNotCleaned(): Effect.Effect<void>
}

class ObservableResourceImpl<E, V> implements ObservableResource<E, V> {
  constructor(
    readonly scoped: Effect.Effect<V, E, Scope.Scope>,
    readonly getState: Effect.Effect<readonly [number, number]>
  ) {}

  assertNotAcquired(): Effect.Effect<void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      strictEqual(numAcquisition, 0, "Resource acquired when it should not have")
      strictEqual(numCleaned, 0, "Resource cleaned when it should not have")
    })
  }

  assertAcquiredOnceAndCleaned(): Effect.Effect<void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      strictEqual(numAcquisition, 1, "Resource not acquired once")
      strictEqual(numCleaned, 1, "Resource not cleaned when it should have")
    })
  }

  assertAcquiredOnceAndNotCleaned(): Effect.Effect<void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      strictEqual(numAcquisition, 1, "Resource not acquired once")
      strictEqual(numCleaned, 0, "Resource cleaned when it should not have")
    })
  }
}

export const makeVoid = (): Effect.Effect<ObservableResource<never, void>> => make(void 0)

export const make = <V>(value: V): Effect.Effect<ObservableResource<never, V>> => makeEffect(Effect.succeed(value))

export const makeEffect = <V, E>(
  effect: Effect.Effect<V, E>
): Effect.Effect<ObservableResource<E, V>> =>
  pipe(
    Effect.zip(Ref.make(0), Ref.make(0)),
    Effect.map(([resourceAcquisitionCount, resourceAcquisitionReleasing]) => {
      const getState = Effect.zip(
        Ref.get(resourceAcquisitionCount),
        Ref.get(resourceAcquisitionReleasing)
      )
      const scoped = Effect.uninterruptibleMask((restore) =>
        Effect.gen(function*() {
          const parent = yield* Effect.scope
          const child = yield* Scope.fork(parent, ExecutionStrategy.sequential)
          yield* Ref.update(resourceAcquisitionCount, (n) => n + 1)
          yield* Scope.addFinalizer(child, Ref.update(resourceAcquisitionReleasing, (n) => n + 1))
          return yield* Effect.acquireReleaseInterruptible(
            restore(effect),
            (exit) => Scope.close(child, exit)
          )
        })
      )
      return new ObservableResourceImpl(scoped, getState)
    })
  )
