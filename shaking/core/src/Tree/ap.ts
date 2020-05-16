import type { Tree } from "./Tree"
import { ap_ } from "./ap_"

export const ap: <A>(fa: Tree<A>) => <B>(fab: Tree<(a: A) => B>) => Tree<B> = (fa) => (
  fab
) => ap_(fab, fa)
