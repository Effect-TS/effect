import type { Either } from "./Either"
import { isLeft } from "./isLeft"
import { leftW } from "./left"
import { rightW } from "./right"
import { tailRec } from "./tailRec"

export const chainRec: <E, A, B>(
  a: A,
  f: (a: A) => Either<E, Either<A, B>>
) => Either<E, B> = (a, f) =>
  tailRec(f(a), (e) =>
    isLeft(e)
      ? rightW(leftW(e.left))
      : isLeft(e.right)
      ? leftW(f(e.right.left))
      : rightW(rightW(e.right.right))
  )
