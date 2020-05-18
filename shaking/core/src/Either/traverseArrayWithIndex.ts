import { traverseWithIndex_ } from "../Array"

import { eitherMonad, Either } from "./either"

export const traverseArrayWithIndex_ = traverseWithIndex_(eitherMonad)

export const traverseArrayWithIndex: <A, E, B>(
  f: (i: number, a: A) => Either<E, B>
) => (ta: Array<A>) => Either<E, Array<B>> = (f) => (ta) =>
  traverseArrayWithIndex_(ta, f)
