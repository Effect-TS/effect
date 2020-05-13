import { reduce as reduce_1 } from "../Readonly/NonEmptyArray/reduce"

import type { NonEmptyArray } from "./NonEmptyArray"

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: NonEmptyArray<A>) => B = reduce_1 as any
