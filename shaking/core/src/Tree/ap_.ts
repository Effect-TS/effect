import type { Tree } from "./Tree"
import { chain_ } from "./chain_"
import { map_ } from "./map_"

export const ap_: <A, B>(fab: Tree<(a: A) => B>, fa: Tree<A>) => Tree<B> = (fab, fa) =>
  chain_(fab, (f) => map_(fa, f))
