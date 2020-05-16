import type { Tree } from "./Tree"
import { ap_ } from "./ap_"
import { map_ } from "./map_"

export const apFirst: <B>(fb: Tree<B>) => <A>(fa: Tree<A>) => Tree<A> = (fb) => (fa) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )
