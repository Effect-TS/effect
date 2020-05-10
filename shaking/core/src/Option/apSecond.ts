import type { Option } from "fp-ts/lib/Option"

import { ap_ } from "./ap_"
import { map_ } from "./map_"

export const apSecond = <B>(fb: Option<B>) => <A>(fa: Option<A>): Option<B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
