import { ap_ } from "./ap_"
import { map_ } from "./map_"

export const apFirst = <B>(fb: readonly B[]) => <A>(fa: readonly A[]): readonly A[] =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )
