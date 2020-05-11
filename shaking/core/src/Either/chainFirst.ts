import type { Either } from "./Either"
import { chain_ } from "./chain"
import { map_ } from "./map"

export const chainFirst = <E, A, B>(f: (a: A) => Either<E, B>) => <E2>(
  ma: Either<E2, A>
): Either<E | E2, A> => chain_(ma, (a) => map_(f(a), () => a))
