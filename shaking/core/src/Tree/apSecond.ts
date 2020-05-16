import type { Tree } from "./Tree"
import { ap_ } from "./ap_"
import { map_ } from "./map_"

export const apSecond = <B>(fb: Tree<B>) => <A>(fa: Tree<A>): Tree<B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
