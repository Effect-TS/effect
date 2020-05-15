import type { Option } from "fp-ts/lib/Option"

import { wither } from "../Record/wither"

import { optionMonad } from "./monad"

export const witherRecord_ = wither(optionMonad)

export const witherRecord: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  witherRecord_(ta, f)
