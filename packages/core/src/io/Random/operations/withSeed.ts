import type { Effect } from "../../Effect"
import { HasRandom, Random } from "../definition"

/**
 * @tsplus static ets/RandomOps withSeed
 */
export function withSeed(seed: number) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & HasRandom, E, A> =>
    self.updateService(HasRandom)(() => Random.live(seed))
}
