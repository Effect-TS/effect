import { reduce_ as reduce__1 } from "../Readonly/Array/reduce_"

export const reduce_: <A, B>(
  fa: A[],
  b: B,
  f: (b: B, a: A) => B
) => B = reduce__1 as any
