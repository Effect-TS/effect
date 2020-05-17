import type { Option } from "../Option/option"
import { record } from "../Record/record"

import type { Either } from "./Either"
import { eitherMonad } from "./eitherMonad"

export const witherRecord_ = record.wither(eitherMonad)

export const witherRecord: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Record<string, A>) => Either<E, Record<string, B>> = (f) => (ta) =>
  witherRecord_(ta, f)
