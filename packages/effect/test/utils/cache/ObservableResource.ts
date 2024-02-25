import * as Effect from "effect/Effect"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Scope from "effect/Scope"
import { expect } from "vitest"

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
      expect(numAcquisition, "Resource acquired when it should not have").toBe(0)
      expect(numCleaned, "Resource cleaned when it should not have").toBe(0)
    })
  }

  assertAcquiredOnceAndCleaned(): Effect.Effect<void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      expect(numAcquisition, "Resource not acquired once").toBe(1)
      expect(numCleaned, "Resource not cleaned when it should have").toBe(1)
    })
  }

  assertAcquiredOnceAndNotCleaned(): Effect.Effect<void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      expect(numAcquisition, "Resource not acquired once").toBe(1)
      expect(numCleaned, "Resource cleaned when it should not have").toBe(0)
    })
  }
}

export const makeUnit = (): Effect.Effect<ObservableResource<never, void>> => make(void 0)

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
        Effect.gen(function*($) {
          const parent = yield* $(Effect.scope)
          const child = yield* $(Scope.fork(parent, ExecutionStrategy.sequential))
          yield* $(Ref.update(resourceAcquisitionCount, (n) => n + 1))
          yield* $(Scope.addFinalizer(child, Ref.update(resourceAcquisitionReleasing, (n) => n + 1)))
          return yield* $(Effect.acquireReleaseInterruptible({
            acquire: restore(effect),
            release: (exit) => Scope.close(child, exit)
          }))
        })
      )
      return new ObservableResourceImpl(scoped, getState)
    })
  )
