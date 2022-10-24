import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @tsplus static effect/core/io/Effect.Aspects reject
 * @tsplus pipeable effect/core/io/Effect reject
 * @category mutations
 * @since 1.0.0
 */
export function reject<A, E1>(pf: (a: A) => Option.Option<E1>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E | E1, A> =>
    self.rejectEffect((a) => pipe(pf(a), Option.map(Effect.fail)))
}
