import type { Option } from "fp-ts/lib/Option"

import { record } from "../Record"

import { optionMonad } from "./monad"

export const witherRecord_ = record.wither(optionMonad)

export const witherRecord: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  witherRecord_(ta, f)
