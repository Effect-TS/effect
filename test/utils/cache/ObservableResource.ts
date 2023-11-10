import { Effect, ExecutionStrategy, Ref, Scope } from "effect"
import { pipe } from "effect/Function"
import { expect } from "vitest"

export interface ObservableResource<E, V> {
  readonly scoped: Effect<Scope, E, V>
  assertNotAcquired(): Effect<never, never, void>
  assertAcquiredOnceAndCleaned(): Effect<never, never, void>
  assertAcquiredOnceAndNotCleaned(): Effect<never, never, void>
}

class ObservableResourceImpl<E, V> implements ObservableResource<E, V> {
  constructor(
    readonly scoped: Effect<Scope, E, V>,
    readonly getState: Effect<never, never, readonly [number, number]>
  ) {}

  assertNotAcquired(): Effect<never, never, void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      expect(numAcquisition, "Resource acquired when it should not have").toBe(0)
      expect(numCleaned, "Resource cleaned when it should not have").toBe(0)
    })
  }

  assertAcquiredOnceAndCleaned(): Effect<never, never, void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      expect(numAcquisition, "Resource not acquired once").toBe(1)
      expect(numCleaned, "Resource not cleaned when it should have").toBe(1)
    })
  }

  assertAcquiredOnceAndNotCleaned(): Effect<never, never, void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      expect(numAcquisition, "Resource not acquired once").toBe(1)
      expect(numCleaned, "Resource cleaned when it should not have").toBe(0)
    })
  }
}

export const makeUnit = (): Effect<never, never, ObservableResource<never, void>> => make(void 0)

export const make = <V>(value: V): Effect<never, never, ObservableResource<never, V>> =>
  makeEffect(Effect.succeed(value))

export const makeEffect = <E, V>(
  effect: Effect<never, E, V>
): Effect<never, never, ObservableResource<E, V>> =>
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
          return yield* $(Effect.acquireReleaseInterruptible(
            restore(effect),
            (exit) => Scope.close(child, exit)
          ))
        })
      )
      return new ObservableResourceImpl(scoped, getState)
    })
  )
