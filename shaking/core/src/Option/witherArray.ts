import type { Option } from "fp-ts/lib/Option"

import { array } from "../Array"

import { optionMonad } from "./monad"

export const witherArray_ = array.wither(optionMonad)

export const witherArray: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => witherArray_(ta, f)
