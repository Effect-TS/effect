import type { Monad1 } from "fp-ts/lib/Monad"

import { flip } from "../Function"

import { URI } from "./URI"
import { ap } from "./ap"
import { chain_ } from "./chain_"
import { map_ } from "./map_"
import { of } from "./of"

export const list: Monad1<URI> = {
  URI,
  map: map_,
  of,
  ap: flip(ap),
  chain: chain_
}
