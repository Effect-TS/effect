import { reduce as reduce_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: ReadonlyNonEmptyArray<A>) => B = reduce_1 as any
