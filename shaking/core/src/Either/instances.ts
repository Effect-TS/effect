import type { Alt2 } from "fp-ts/lib/Alt"
import type { Bifunctor2 } from "fp-ts/lib/Bifunctor"
import type { Extend2 } from "fp-ts/lib/Extend"
import type { Foldable2 } from "fp-ts/lib/Foldable"
import type { Traversable2 } from "fp-ts/lib/Traversable"

import { URI } from "./URI"
import { alt_ } from "./alt"
import { ap_ } from "./ap"
import { bimap_ } from "./bimap"
import { chain_ } from "./chain"
import { chainRec } from "./chainRec"
import { extend_ } from "./extend"
import { foldMap_ } from "./foldMap"
import { left } from "./left"
import { map_ } from "./map"
import { mapLeft_ } from "./mapLeft"
import type { Monad2M, MonadThrow2M, ChainRec2M } from "./overloads"
import { reduce_ } from "./reduce"
import { reduceRight_ } from "./reduceRight"
import { right } from "./right"
import { sequence } from "./sequence"
import { traverse } from "./traverse"

/**
 * @since 2.0.0
 */
export const either: Monad2M<URI> &
  Foldable2<URI> &
  Traversable2<URI> &
  Bifunctor2<URI> &
  Alt2<URI> &
  Extend2<URI> &
  ChainRec2M<URI> &
  MonadThrow2M<URI> = {
  URI,
  _K: "Monad2M",
  map: map_,
  of: right,
  ap: ap_,
  chain: chain_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse,
  sequence,
  bimap: bimap_,
  mapLeft: mapLeft_,
  alt: alt_,
  extend: extend_,
  chainRec,
  throwError: left
}
