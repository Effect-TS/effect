import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 *
 * @tsplus static effect/core/stm/TRef.Aspects getAndUpdateSome
 * @tsplus pipeable effect/core/stm/TRef getAndUpdateSome
 * @category mutations
 * @since 1.0.0
 */
export function getAndUpdateSome<A>(pf: (a: A) => Option.Option<A>) {
  return (self: TRef<A>): STM<never, never, A> =>
    self.getAndUpdate((a) => pipe(pf(a), Option.getOrElse(a)))
}
