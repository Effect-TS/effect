import { reduce_ as reduce__1 } from "../Readonly/Record"

export const reduce_: <A, B>(
  fa: Record<string, A>,
  b: B,
  f: (b: B, a: A) => B
) => B = reduce__1
