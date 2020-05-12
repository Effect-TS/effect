import { reduceWithIndex_ } from "./reduceWithIndex_"

export const reduce_: <A, B>(fa: readonly A[], b: B, f: (b: B, a: A) => B) => B = (
  fa,
  b,
  f
) => reduceWithIndex_(fa, b, (_, b, a) => f(b, a))
