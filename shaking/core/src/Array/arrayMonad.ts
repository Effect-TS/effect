import type { Monad1 } from "fp-ts/lib/Monad"

import { URI } from "./URI"
import { ap_ } from "./ap_"
import { chain_ } from "./chain_"
import { map_ } from "./map_"
import { of } from "./of"

export const arrayMonad: Monad1<URI> = {
  URI,
  map: map_,
  of,
  ap: ap_,
  chain: chain_
}
