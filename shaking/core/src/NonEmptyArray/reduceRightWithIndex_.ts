import { reduceRightWithIndex_ as reduceRightWithIndex__1 } from "../Readonly/NonEmptyArray/reduceRightWithIndex_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const reduceRightWithIndex_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = reduceRightWithIndex__1
