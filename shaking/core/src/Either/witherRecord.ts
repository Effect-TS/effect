import type { Option } from "../Option/option"
import { wither_ } from "../Record/record"

import { eitherMonad, Either } from "./either"

export const witherRecord_ = wither_(eitherMonad)

export const witherRecord: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Record<string, A>) => Either<E, Record<string, B>> = (f) => (ta) =>
  witherRecord_(ta, f)
