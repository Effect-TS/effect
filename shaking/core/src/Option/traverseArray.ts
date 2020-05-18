import type { Option } from "fp-ts/lib/Option"

import { traverse_ } from "../Array"

import { optionMonad } from "./option"

export const traverseArray_ =
  /*#__PURE__*/
  (() => traverse_(optionMonad))()

export const traverseArray: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => traverseArray_(ta, f)
