import type { Either } from "./Either"
import { isLeft } from "./isLeft"
import { right } from "./right"

export const extend_: <E, A, B, E2>(
  wa: Either<E, A>,
  f: (wa: Either<E2, A>) => B
) => Either<E | E2, B> = (wa, f) => (isLeft(wa) ? wa : right(f(wa)))

export const extend: <E, A, B>(
  f: (fa: Either<E, A>) => B
) => <E2>(ma: Either<E2, A>) => Either<E | E2, B> = (f) => (ma) => extend_(ma, f)
