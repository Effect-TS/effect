import type { Either } from "fp-ts/lib/Either"
import type { Option } from "fp-ts/lib/Option"

import { either } from "../Either/either"

import { optionMonad } from "./monad"

export const traverseEither_ = either.traverse(optionMonad)

export const traverseEither: <A, B>(
  f: (a: A) => Option<B>
) => <E>(ta: Either<E, A>) => Option<Either<E, B>> = (f) => (ta) =>
  traverseEither_(ta, f)
