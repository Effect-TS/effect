import { Cause } from "../../Cause.js"
import { Effect } from "../../Effect.js"
import { dual } from "../../Function.js"
import type { Scope } from "../../Scope.js"
import { STM } from "../../STM.js"
import type { TRef } from "../../TRef.js"
import type { TSemaphore } from "../../TSemaphore.js"
import * as core from "./core.js"
import * as tRef from "./tRef.js"

/** @internal */
const TSemaphoreSymbolKey = "effect/TSemaphore"

/** @internal */
export const TSemaphoreTypeId: TSemaphore.TSemaphoreTypeId = Symbol.for(
  TSemaphoreSymbolKey
) as TSemaphore.TSemaphoreTypeId

/** @internal */
class TSemaphoreImpl implements TSemaphore {
  readonly [TSemaphoreTypeId]: TSemaphore.TSemaphoreTypeId = TSemaphoreTypeId
  constructor(readonly permits: TRef<number>) {}
}

/** @internal */
export const make = (permits: number): STM<never, never, TSemaphore> =>
  STM.map(tRef.make(permits), (permits) => new TSemaphoreImpl(permits))

/** @internal */
export const acquire = (self: TSemaphore): STM<never, never, void> => acquireN(self, 1)

/** @internal */
export const acquireN = dual<
  (n: number) => (self: TSemaphore) => STM<never, never, void>,
  (self: TSemaphore, n: number) => STM<never, never, void>
>(2, (self, n) =>
  core.withSTMRuntime((driver) => {
    if (n < 0) {
      throw Cause.IllegalArgumentException(`Unexpected negative value ${n} passed to Semaphore.acquireN`)
    }
    const value = tRef.unsafeGet(self.permits, driver.journal)
    if (value < n) {
      return STM.retry
    } else {
      return STM.succeed(tRef.unsafeSet(self.permits, value - n, driver.journal))
    }
  }))

/** @internal */
export const available = (self: TSemaphore) => tRef.get(self.permits)

/** @internal */
export const release = (self: TSemaphore): STM<never, never, void> => releaseN(self, 1)

/** @internal */
export const releaseN = dual<
  (n: number) => (self: TSemaphore) => STM<never, never, void>,
  (self: TSemaphore, n: number) => STM<never, never, void>
>(2, (self, n) =>
  core.withSTMRuntime((driver) => {
    if (n < 0) {
      throw Cause.IllegalArgumentException(`Unexpected negative value ${n} passed to Semaphore.releaseN`)
    }
    const current = tRef.unsafeGet(self.permits, driver.journal)
    return STM.succeed(tRef.unsafeSet(self.permits, current + n, driver.journal))
  }))

/** @internal */
export const withPermit = dual<
  (semaphore: TSemaphore) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>,
  <R, E, A>(self: Effect<R, E, A>, semaphore: TSemaphore) => Effect<R, E, A>
>(2, (self, semaphore) => withPermits(self, semaphore, 1))

/** @internal */
export const withPermits = dual<
  (
    semaphore: TSemaphore,
    permits: number
  ) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>,
  <R, E, A>(
    self: Effect<R, E, A>,
    semaphore: TSemaphore,
    permits: number
  ) => Effect<R, E, A>
>(3, (self, semaphore, permits) =>
  Effect.uninterruptibleMask((restore) =>
    Effect.zipRight(
      restore(core.commit(acquireN(permits)(semaphore))),
      Effect.ensuring(
        self,
        core.commit(releaseN(permits)(semaphore))
      )
    )
  ))

/** @internal */
export const withPermitScoped = (self: TSemaphore): Effect<Scope, never, void> =>
  withPermitsScoped(self, 1)

/** @internal */
export const withPermitsScoped = dual<
  (permits: number) => (self: TSemaphore) => Effect<Scope, never, void>,
  (self: TSemaphore, permits: number) => Effect<Scope, never, void>
>(2, (self, permits) =>
  Effect.acquireReleaseInterruptible(
    core.commit(acquireN(self, permits)),
    () => core.commit(releaseN(self, permits))
  ))

/** @internal */
export const unsafeMakeSemaphore = (permits: number): TSemaphore => {
  return new TSemaphoreImpl(new tRef.TRefImpl(permits))
}
