import { reduceRightWithIndex_ as reduceRightWithIndex__1 } from "../Readonly/Record"

export const reduceRightWithIndex_: <A, B>(
  fa: Record<string, A>,
  b: B,
  f: (i: string, a: A, b: B) => B
) => B = reduceRightWithIndex__1
