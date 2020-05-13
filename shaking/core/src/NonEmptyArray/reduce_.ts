import { reduce_ as reduce__1 } from "../Readonly/NonEmptyArray/reduce_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const reduce_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (b: B, a: A) => B
) => B = reduce__1 as any
