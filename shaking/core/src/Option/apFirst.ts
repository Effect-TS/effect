import type { Option } from "fp-ts/lib/Option"

import { ap_ } from "./ap_"
import { map_ } from "./map_"

export const apFirst: <B>(fb: Option<B>) => <A>(fa: Option<A>) => Option<A> = (fb) => (
  fa
) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )
