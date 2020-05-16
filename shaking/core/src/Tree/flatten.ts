import type { Tree } from "./Tree"
import { chain_ } from "./chain_"

export const flatten: <A>(mma: Tree<Tree<A>>) => Tree<A> = (mma) =>
  chain_(mma, (x) => x)
