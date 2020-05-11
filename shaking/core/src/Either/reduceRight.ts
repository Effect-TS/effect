import type { Either } from "./Either"
import { isLeft } from "./isLeft"

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => <E>(fa: Either<E, A>) => B = (b, f) => (fa) => reduceRight_(fa, b, f)

export const reduceRight_: <E, A, B>(
  fa: Either<E, A>,
  b: B,
  f: (a: A, b: B) => B
) => B = (fa, b, f) => (isLeft(fa) ? b : f(fa.right, b))
