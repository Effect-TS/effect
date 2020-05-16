import type { Tree } from "./Tree"
import { chain_ } from "./chain_"

export const chain: <A, B>(f: (a: A) => Tree<B>) => (ma: Tree<A>) => Tree<B> = (f) => (
  ma
) => chain_(ma, f)
