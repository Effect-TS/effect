import type { Monad1 } from "fp-ts/lib/Monad"

import { flip } from "../Function"

import { URI } from "./URI"
import { ap } from "./ap"
import { chain } from "./chain"
import { map } from "./map"
import { of } from "./of"

export const list: Monad1<URI> = {
  URI,
  map,
  of,
  ap: flip(ap),
  chain
}
