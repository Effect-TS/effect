import { Option, traverse_ } from "../Option/option"

import type { Either } from "./Either"
import { eitherMonadClassic } from "./eitherMonadClassic"

export const traverseOption_ = traverse_(eitherMonadClassic)

export const traverseOption: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) => traverseOption_(ta, f)
