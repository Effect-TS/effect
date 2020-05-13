import { reduceWithIndex_ as reduceWithIndex__1 } from "../Readonly/NonEmptyArray/reduceWithIndex_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const reduceWithIndex_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (i: number, b: B, a: A) => B
) => B = reduceWithIndex__1
