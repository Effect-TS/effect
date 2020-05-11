import { array } from "../Array"

import type { Either } from "./Either"
import { eitherMonad } from "./eitherMonad"

export const traverseArray_ = array.traverse(eitherMonad)

export const traverseArray: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Array<A>) => Either<E, Array<B>> = (f) => (ta) => traverseArray_(ta, f)
