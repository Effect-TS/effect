import type { Either } from "./Either"
import { isLeft } from "./isLeft"

export const reduce_: <E, A, B>(fa: Either<E, A>, b: B, f: (b: B, a: A) => B) => B = (
  fa,
  b,
  f
) => (isLeft(fa) ? b : f(b, fa.right))

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => <E>(fa: Either<E, A>) => B = (b, f) => (fa) => reduce_(fa, b, f)
