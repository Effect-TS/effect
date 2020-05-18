import { traverse_, Either } from "../Either/either"

import { optionMonad, Option } from "./option"

export const traverseEither_ = traverse_(optionMonad)

export const traverseEither: <A, B>(
  f: (a: A) => Option<B>
) => <E>(ta: Either<E, A>) => Option<Either<E, B>> = (f) => (ta) =>
  traverseEither_(ta, f)
