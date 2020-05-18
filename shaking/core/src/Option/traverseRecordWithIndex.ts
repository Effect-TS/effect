import type { Option } from "fp-ts/lib/Option"

import { traverseWithIndex_ } from "../Record/record"

import { optionMonad } from "./option"

export const traverseRecordWithIndex_ =
  /*#__PURE__*/
  (() => traverseWithIndex_(optionMonad))()

export const traverseRecordWithIndex: <A, B>(
  f: (k: string, a: A) => Option<B>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  traverseRecordWithIndex_(ta, f)
