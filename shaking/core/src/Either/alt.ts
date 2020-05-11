import type { Either } from "./Either"
import { isLeft } from "./isLeft"

export const alt_: <E, E2, A>(
  fx: Either<E, A>,
  fy: () => Either<E2, A>
) => Either<E | E2, A> = (fx, fy) => (isLeft(fx) ? fy() : fx)

export const alt: <E, A>(
  that: () => Either<E, A>
) => <E2>(fa: Either<E2, A>) => Either<E | E2, A> = (that) => (fa) => alt_(fa, that)
