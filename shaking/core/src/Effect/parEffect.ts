import { EffectURI as URI } from "../Support/Common"
import { Monad4EP } from "../Support/Overloads"

import { chain_ } from "./chain"
import { map_ } from "./map"
import { parAp_ } from "./parAp_"
import { pure } from "./pure"

export const parEffect: Monad4EP<URI> = {
  URI,
  _CTX: "async",
  of: pure,
  map: map_,
  ap: parAp_,
  chain: chain_
}
