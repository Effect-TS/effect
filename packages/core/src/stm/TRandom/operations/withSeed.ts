import { LiveTRandom } from "@effect/core/stm/TRandom/operations/live"
import { PCGRandom } from "@fp-ts/data/Random"

/**
 * @tsplus static effect/core/stm/TRandom.Ops withSeed
 * @category aspects
 * @since 1.0.0
 */
export function withSeed(seed: number) {
  return <R, E, A>(stm: STM<R, E, A>): STM<Exclude<R, TRandom>, E, A> =>
    stm.provideServiceSTM(
      TRandom.Tag,
      TRef.make(() => new PCGRandom(seed).getState()).map((tRef) => new LiveTRandom(tRef))
    )
}
