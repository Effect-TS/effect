import type { Either } from "./Either"
import { chain_ } from "./chain"

export const flatten: <E, E2, A>(mma: Either<E, Either<E2, A>>) => Either<E | E2, A> = (
  mma
) => chain_(mma, (x) => x)
