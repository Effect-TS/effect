import { reduceWithIndex_ } from "./reduceWithIndex_"

export const reduceWithIndex: <A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
) => (fa: readonly A[]) => B = (b, f) => (fa) => reduceWithIndex_(fa, b, f)
