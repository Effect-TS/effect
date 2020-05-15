import { reduceWithIndex_ as reduceWithIndex__1 } from "../Readonly/Record"

export const reduceWithIndex_: <A, B>(
  fa: Record<string, A>,
  b: B,
  f: (i: string, b: B, a: A) => B
) => B = reduceWithIndex__1
