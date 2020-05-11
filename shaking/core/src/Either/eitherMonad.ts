import type { ChainRec2M } from "fp-ts/lib/ChainRec"
import type { Monad2M } from "fp-ts/lib/Monad"

import { URI } from "./URI"
import { ap_ } from "./ap"
import { chain_ } from "./chain"
import { chainRec } from "./chainRec"
import { map_ } from "./map"
import { right } from "./right"

/**
 * @since 2.0.0
 */
export const eitherMonad: Monad2M<URI> & ChainRec2M<URI> = {
  URI,
  _K: "Monad2M",
  map: map_,
  of: right,
  ap: ap_,
  chain: chain_,
  chainRec
}
