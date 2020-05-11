import type { Refinement, Predicate } from "../Function"

import type { Either } from "./Either"
import { left } from "./left"
import { right } from "./right"

export const fromPredicate: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
    a: A
  ) => Either<E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (a: A): Either<E, A> =>
  predicate(a) ? right(a) : left(onFalse(a))
