import { reduceWithIndex_ as reduceWithIndex__1 } from "../Readonly/Array/reduceWithIndex_"

export const reduceWithIndex_: <A, B>(
  fa: A[],
  b: B,
  f: (i: number, b: B, a: A) => B
) => B = reduceWithIndex__1 as any
