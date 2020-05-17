import type { Option } from "fp-ts/lib/Option"

import { wither_ } from "../Record/record"

import { optionMonad } from "./monad"

export const witherRecord_ = wither_(optionMonad)

export const witherRecord: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  witherRecord_(ta, f)
