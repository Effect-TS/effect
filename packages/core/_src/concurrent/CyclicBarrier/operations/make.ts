import { CyclicBarrierInternal } from "@effect/core/concurrent/CyclicBarrier/definition"

/**
 * @tsplus static effect/core/concurrent/CyclicBarrier.Ops __call
 * @tsplus static effect/core/concurrent/CyclicBarrier.Ops make
 */
export function make(
  parties: number,
  action: Effect<never, never, unknown> = Effect.unit
): Effect<never, never, CyclicBarrier> {
  return Do(($) => {
    const waiting = $(Ref.make(0))
    const broken = $(Ref.make(false))
    const lock = $(Deferred.make<void, void>().flatMap((deferred) => Ref.make(deferred)))
    return new CyclicBarrierInternal(parties, waiting, lock, action, broken)
  })
}
