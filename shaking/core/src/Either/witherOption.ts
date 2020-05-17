import { wither_, Option } from "../Option/option"

import type { Either } from "./Either"
import { eitherMonadClassic } from "./eitherMonadClassic"

export const witherOption_ = wither_(eitherMonadClassic)

export const witherOption: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) => witherOption_(ta, f)
