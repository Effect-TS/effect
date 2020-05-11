import type { Refinement, Predicate } from "../Function"

import type { Either } from "./Either"
import { chain_ } from "./chain"
import { left } from "./left"
import { right } from "./right"

export const filterOrElse: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
    ma: Either<E, A>
  ) => Either<E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (
    ma: Either<E, A>
  ) => Either<E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (
  ma: Either<E, A>
): Either<E, A> => chain_(ma, (a) => (predicate(a) ? right(a) : left(onFalse(a))))
