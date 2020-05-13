import { reduce_ as reduce__1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const reduce_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  b: B,
  f: (b: B, a: A) => B
) => B = reduce__1 as any
