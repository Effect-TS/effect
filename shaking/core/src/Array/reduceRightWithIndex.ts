import { reduceRightWithIndex as reduceRightWithIndex_1 } from "../Readonly/Array/reduceRightWithIndex"

export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: A[]) => B = reduceRightWithIndex_1 as any
