import { reduce as reduce_1 } from "../Readonly/Array/reduce"

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: A[]) => B = reduce_1 as any
