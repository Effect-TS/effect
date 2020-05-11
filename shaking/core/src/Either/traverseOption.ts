import type { Option } from "../Option/Option"
import { traverse } from "../Option/traverse"

import type { Either } from "./Either"
import { eitherMonadClassic } from "./eitherMonadClassic"

export const traverseOption_ = traverse(eitherMonadClassic)

export const traverseOption: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) => traverseOption_(ta, f)
