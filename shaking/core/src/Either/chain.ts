import type { Either } from "./Either"
import { isLeft } from "./isLeft"

export const chain_: <E, A, B, E2>(
  fa: Either<E, A>,
  f: (a: A) => Either<E2, B>
) => Either<E | E2, B> = (ma, f) => (isLeft(ma) ? ma : f(ma.right))

export const chain: <E, A, B>(
  f: (a: A) => Either<E, B>
) => <E2>(ma: Either<E2, A>) => Either<E | E2, B> = (f) => (ma) => chain_(ma, f)
