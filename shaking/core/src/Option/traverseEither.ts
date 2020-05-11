import type { Either } from "../Either/Either"
import { traverse } from "../Either/traverse"

import type { Option } from "./Option"
import { optionMonad } from "./monad"

export const traverseEither_ = traverse(optionMonad)

export const traverseEither: <A, B>(
  f: (a: A) => Option<B>
) => <E>(ta: Either<E, A>) => Option<Either<E, B>> = (f) => (ta) =>
  traverseEither_(ta, f)
