import type { Option } from "fp-ts/lib/Option"

import { record } from "../Record"

import { optionMonad } from "./monad"

export const traverseRecord_ = record.traverse(optionMonad)

export const traverseRecord: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  traverseRecord_(ta, f)
