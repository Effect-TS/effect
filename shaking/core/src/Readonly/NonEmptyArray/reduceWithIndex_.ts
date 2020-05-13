import { reduceWithIndex_ as reduceWithIndex__1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const reduceWithIndex_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  b: B,
  f: (i: number, b: B, a: A) => B
) => B = reduceWithIndex__1 as any
