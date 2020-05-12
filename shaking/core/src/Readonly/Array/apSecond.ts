import { ap_ } from "./ap_"
import { map_ } from "./map_"

export const apSecond = <B>(fb: readonly B[]) => <A>(fa: readonly A[]): readonly B[] =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
