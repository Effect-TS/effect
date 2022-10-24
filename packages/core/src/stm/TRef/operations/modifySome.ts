import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus static effect/core/stm/TRef.Aspects modifySome
 * @tsplus pipeable effect/core/stm/TRef modifySome
 * @category mutations
 * @since 1.0.0
 */
export function modifySome<A, B>(def: B, pf: (a: A) => Option.Option<readonly [B, A]>) {
  return (self: TRef<A>): STM<never, never, B> =>
    self.modify((a) => pipe(pf(a), Option.getOrElse([def, a] as const)))
}
