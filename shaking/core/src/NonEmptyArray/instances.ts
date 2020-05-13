import type { Alt1 } from "fp-ts/lib/Alt"
import type { Comonad1 } from "fp-ts/lib/Comonad"
import type { FoldableWithIndex1 } from "fp-ts/lib/FoldableWithIndex"
import type { FunctorWithIndex1 } from "fp-ts/lib/FunctorWithIndex"
import type { Monad1 } from "fp-ts/lib/Monad"
import type { TraversableWithIndex1 } from "fp-ts/lib/TraversableWithIndex"

import { URI } from "./URI"
import { alt_ } from "./alt_"
import { ap_ } from "./ap_"
import { chain_ } from "./chain_"
import { extend_ } from "./extend_"
import { foldMapWithIndex_ } from "./foldMapWithIndex_"
import { foldMap_ } from "./foldMap_"
import { head } from "./head"
import { mapWithIndex_ } from "./mapWithIndex_"
import { map_ } from "./map_"
import { of } from "./of"
import { reduceRightWithIndex_ } from "./reduceRightWithIndex_"
import { reduceRight_ } from "./reduceRight_"
import { reduceWithIndex_ } from "./reduceWithIndex_"
import { reduce_ } from "./reduce_"
import { sequence } from "./sequence"
import { traverse } from "./traverse"
import { traverseWithIndex } from "./traverseWithIndex"

/**
 * @since 2.0.0
 */
export const nonEmptyArray: Monad1<URI> &
  Comonad1<URI> &
  TraversableWithIndex1<URI, number> &
  FunctorWithIndex1<URI, number> &
  FoldableWithIndex1<URI, number> &
  Alt1<URI> = {
  URI,
  map: map_,
  mapWithIndex: mapWithIndex_,
  of,
  ap: ap_,
  chain: chain_,
  extend: extend_,
  extract: head,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse,
  sequence,
  reduceWithIndex: reduceWithIndex_,
  foldMapWithIndex: foldMapWithIndex_,
  reduceRightWithIndex: reduceRightWithIndex_,
  traverseWithIndex,
  alt: alt_
}
