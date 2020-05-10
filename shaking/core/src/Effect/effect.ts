import { EffectURI as URI } from "../Support/Common"
import { Effect } from "../Support/Common/effect"
import { Monad4E } from "../Support/Overloads"

import { ap_ } from "./ap"
import { chain_ } from "./chain"
import { map_ } from "./map"
import { pure } from "./pure"

export { Effect }

export const effect: Monad4E<URI> = {
  URI,
  map: map_,
  of: pure,
  ap: ap_,
  chain: chain_
}
