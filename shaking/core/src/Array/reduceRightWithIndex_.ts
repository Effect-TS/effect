import { reduceRightWithIndex_ as reduceRightWithIndex__1 } from "../Readonly/Array/reduceRightWithIndex_"

export const reduceRightWithIndex_: <A, B>(
  fa: A[],
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = reduceRightWithIndex__1 as any
