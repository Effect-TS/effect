import { done, raise } from "../Exit"
import type { Refinement, Predicate } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { completed } from "./completed"

export const filterOrElse: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <S, R>(
    ma: Effect<S, R, E, A>
  ) => Effect<S, R, E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): <S, R>(
    ma: Effect<S, R, E, A>
  ) => Effect<S, R, E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => <S, R>(
  ma: Effect<S, R, E, A>
): Effect<S, R, E, A> =>
  chain_(ma, (a) => (predicate(a) ? completed(raise(onFalse(a))) : completed(done(a))))

export const fromPredicate: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
    a: A
  ) => Effect<never, unknown, E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (
    a: A
  ) => Effect<never, unknown, E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (
  a: A
): Effect<never, unknown, E, A> =>
  predicate(a) ? completed(done(a)) : completed(raise(onFalse(a)))
