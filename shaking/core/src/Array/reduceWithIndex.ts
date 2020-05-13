import { reduceWithIndex as reduceWithIndex_1 } from "../Readonly/Array/reduceWithIndex"

export const reduceWithIndex: <A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
) => (fa: A[]) => B = reduceWithIndex_1 as any
