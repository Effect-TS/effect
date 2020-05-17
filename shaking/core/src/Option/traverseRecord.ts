import type { Option } from "fp-ts/lib/Option"

import { traverse_ } from "../Record/record"

import { optionMonad } from "./monad"

export const traverseRecord_ = traverse_(optionMonad)

export const traverseRecord: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  traverseRecord_(ta, f)
