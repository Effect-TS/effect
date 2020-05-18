import type { Option } from "fp-ts/lib/Option"

import { traverseWithIndex_ } from "../Array"

import { optionMonad } from "./option"

export const traverseArrayWithIndex_ =
  /*#__PURE__*/
  (() => traverseWithIndex_(optionMonad))()

export const traverseArrayWithIndex: <A, E, B>(
  f: (i: number, a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => traverseArrayWithIndex_(ta, f)
