import { reduceRightWithIndex_ as reduceRightWithIndex__1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const reduceRightWithIndex_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = reduceRightWithIndex__1 as any
