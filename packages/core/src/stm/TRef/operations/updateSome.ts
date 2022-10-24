import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus static effect/core/stm/TRef.Aspects updateSome
 * @tsplus pipeable effect/core/stm/TRef updateSome
 * @category mutations
 * @since 1.0.0
 */
export function updateSome<A>(pf: (a: A) => Option.Option<A>) {
  return (self: TRef<A>): STM<never, never, void> =>
    self.update((a) => pipe(pf(a), Option.getOrElse(a)))
}
