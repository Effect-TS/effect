import type { Option } from "fp-ts/lib/Option"

import { array } from "../Array"

import { optionMonad } from "./monad"

export const traverseArray_ = array.traverse(optionMonad)

export const traverseArray: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => traverseArray_(ta, f)
