/**
 * @since 2.0.0
 */
import type { Monad1 } from "fp-ts/lib/Monad"

import { identity as id } from "../Function"

import { URI } from "./URI"
import { ap_ } from "./ap_"
import { chain_ } from "./chain_"
import { map_ } from "./map_"

/**
 * @since 2.0.0
 */
export const identityMonad: Monad1<URI> = {
  URI,
  map: map_,
  of: id,
  ap: ap_,
  chain: chain_
}
