import type { Option } from "fp-ts/lib/Option"

import { array } from "../Array"

import { optionMonad } from "./monad"

export const traverseArrayWithIndex_ = array.traverseWithIndex(optionMonad)

export const traverseArrayWithIndex: <A, E, B>(
  f: (i: number, a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => traverseArrayWithIndex_(ta, f)
