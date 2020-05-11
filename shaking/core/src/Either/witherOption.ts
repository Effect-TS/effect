import type { Option } from "../Option/Option"
import { wither } from "../Option/wither"

import type { Either } from "./Either"
import { eitherMonadClassic } from "./eitherMonadClassic"

export const witherOption_ = wither(eitherMonadClassic)

export const witherOption: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) =>
  wither(eitherMonadClassic)(ta, f)
