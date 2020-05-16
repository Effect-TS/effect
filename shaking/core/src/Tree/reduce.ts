import type { Tree } from "./Tree"
import { reduce_ } from "./reduce_"

export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Tree<A>) => B = (
  b,
  f
) => (fa) => reduce_(fa, b, f)
