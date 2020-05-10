import type { Monad1 } from "fp-ts/lib/Monad"

import { ap_ } from "./ap_"
import { chain_ } from "./chain_"
import { URI } from "./common"
import { map_ } from "./map_"
import { some } from "./some"

/**
 * @since 2.0.0
 */
export const optionMonad: Monad1<URI> = {
  URI: "Option",
  map: map_,
  of: some,
  ap: ap_,
  chain: chain_
}
