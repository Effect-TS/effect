import { EffectURI as URI } from "../Support/Common"
import { Monad4EP } from "../Support/Overloads"

import { chain_ } from "./chain"
import { map_ } from "./map"
import { parFastAp_ } from "./parFastAp_"
import { pure } from "./pure"

/* Note that this instance is not respecting the classical apply law */
export const parFastEffect: Monad4EP<URI> = {
  URI,
  _CTX: "async",
  of: pure,
  map: map_,
  ap: parFastAp_,
  chain: chain_
}
