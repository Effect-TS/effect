import { array } from "../Array"

import type { Either } from "./Either"
import { eitherMonad } from "./eitherMonad"

export const traverseArrayWithIndex_ = array.traverseWithIndex(eitherMonad)

export const traverseArrayWithIndex: <A, E, B>(
  f: (i: number, a: A) => Either<E, B>
) => (ta: Array<A>) => Either<E, Array<B>> = (f) => (ta) =>
  traverseArrayWithIndex_(ta, f)
