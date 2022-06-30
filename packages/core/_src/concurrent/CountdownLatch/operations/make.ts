import { CountdownLatchInternal } from "@effect/core/concurrent/CountdownLatch/definition"

/**
 * @tsplus static effect/core/concurrent/CountdownLatch.Ops __call
 * @tsplus static effect/core/concurrent/CountdownLatch.Ops make
 */
export function make(n: number): Effect<never, Maybe<never>, CountdownLatch> {
  if (n <= 0) {
    // People calling this with a negative value deserve this
    return Effect.none.flip
  }
  return Do(($) => {
    const count = $(Ref.make(n))
    const waiters = $(Deferred.make<never, void>())
    return new CountdownLatchInternal(count, waiters)
  })
}
