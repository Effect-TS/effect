/**
 * @since 2.0.0
 */
import type { Alt1 } from "fp-ts/lib/Alt"
import type { ChainRec1 } from "fp-ts/lib/ChainRec"
import type { Comonad1 } from "fp-ts/lib/Comonad"
import type { Foldable1 } from "fp-ts/lib/Foldable"
import type { Monad1 } from "fp-ts/lib/Monad"
import type { Traversable1 } from "fp-ts/lib/Traversable"

import { identity as id } from "../Function"

import { URI } from "./URI"
import { alt_ } from "./alt_"
import { ap_ } from "./ap_"
import { chainRec } from "./chainRec"
import { chain_ } from "./chain_"
import { extend_ } from "./extend_"
import { extract } from "./extract"
import { foldMap_ } from "./foldMap_"
import { map_ } from "./map_"
import { reduceRight_ } from "./reduceRight_"
import { reduce_ } from "./reduce_"
import { sequence } from "./sequence"
import { traverse } from "./traverse"

/**
 * @since 2.0.0
 */
export const identity: Monad1<URI> &
  Foldable1<URI> &
  Traversable1<URI> &
  Alt1<URI> &
  Comonad1<URI> &
  ChainRec1<URI> = {
  URI,
  map: map_,
  of: id,
  ap: ap_,
  chain: chain_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse,
  sequence,
  alt: alt_,
  extract,
  extend: extend_,
  chainRec
}
