import { LiveTRandom } from "@effect/core/stm/TRandom/operations/live"

/**
 * @tsplus static ets/TRandom/Ops withSeed
 */
export function withSeed(seed: number) {
  return <R, E, A>(stm: STM<R, E, A>): STM<Exclude<R, TRandom>, E, A> =>
    stm.provideServiceSTM(
      TRandom.Tag,
      TRef.make(new RandomPCG(seed).getState()).map((_) => new LiveTRandom(_))
    )
}
