import type { Either } from "./Either"
import { isLeft } from "./isLeft"
import { right } from "./right"

export const map_: <E, A, B>(fa: Either<E, A>, f: (a: A) => B) => Either<E, B> = (
  ma,
  f
) => (isLeft(ma) ? ma : right(f(ma.right)))

export const map: <A, B>(f: (a: A) => B) => <E>(fa: Either<E, A>) => Either<E, B> = (
  f
) => (fa) => map_(fa, f)
