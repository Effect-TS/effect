import { array } from "../Array"
import type { Option } from "../Option/Option"

import type { Either } from "./Either"
import { eitherMonad } from "./eitherMonad"

export const witherArray_ = array.wither(eitherMonad)

export const witherArray: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Array<A>) => Either<E, Array<B>> = (f) => (ta) => witherArray_(ta, f)
