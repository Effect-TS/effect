import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus static effect/core/stm/TRef.Aspects updateSomeAndGet
 * @tsplus pipeable effect/core/stm/TRef updateSomeAndGet
 * @category mutations
 * @since 1.0.0
 */
export function updateSomeAndGet<A>(pf: (a: A) => Option.Option<A>) {
  return (self: TRef<A>): STM<never, never, A> =>
    self.updateAndGet((a) => pipe(pf(a), Option.getOrElse(a)))
}
