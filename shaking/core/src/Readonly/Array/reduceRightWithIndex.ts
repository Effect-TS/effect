import { reduceRightWithIndex_ } from "./reduceRightWithIndex_"

export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: readonly A[]) => B = (b, f) => (fa) => reduceRightWithIndex_(fa, b, f)
