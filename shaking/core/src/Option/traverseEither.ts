import type { Either } from "../Either/Either"
import { traverse } from "../Either/traverse"

import { optionMonad, Option } from "./option"

export const traverseEither_ = traverse(optionMonad)

export const traverseEither: <A, B>(
  f: (a: A) => Option<B>
) => <E>(ta: Either<E, A>) => Option<Either<E, B>> = (f) => (ta) =>
  traverseEither_(ta, f)
