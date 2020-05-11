import type { ChainRec2 } from "fp-ts/lib/ChainRec"
import type { Monad2 } from "fp-ts/lib/Monad"

import { URI } from "./URI"
import { ap_ } from "./ap"
import { chain_ } from "./chain"
import { chainRec } from "./chainRec"
import { map_ } from "./map"
import { right } from "./right"

/**
 * @since 2.0.0
 */
export const eitherMonadClassic: Monad2<URI> & ChainRec2<URI> = {
  URI,
  map: map_,
  of: right,
  ap: ap_,
  chain: chain_,
  chainRec
}
