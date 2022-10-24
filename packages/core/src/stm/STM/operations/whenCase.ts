import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static effect/core/stm/STM.Ops whenCase
 * @category mutations
 * @since 1.0.0
 */
export function whenCase<R, E, A, B>(
  a: LazyArg<A>,
  pf: (a: A) => Option.Option<STM<R, E, B>>
): STM<R, E, Option.Option<B>> {
  return STM.sync(a).flatMap((a) =>
    pipe(
      pf(a),
      Option.map((stm) => stm.asSome),
      Option.getOrElse(STM.none)
    )
  )
}
