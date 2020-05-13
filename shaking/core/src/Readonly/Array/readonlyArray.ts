import type { Alternative1 } from "fp-ts/lib/Alternative"
import type { Compactable1 } from "fp-ts/lib/Compactable"
import type { Extend1 } from "fp-ts/lib/Extend"
import type { FilterableWithIndex1 } from "fp-ts/lib/FilterableWithIndex"
import type { Foldable1 } from "fp-ts/lib/Foldable"
import type { FoldableWithIndex1 } from "fp-ts/lib/FoldableWithIndex"
import type { FunctorWithIndex1 } from "fp-ts/lib/FunctorWithIndex"
import type { Monad1 } from "fp-ts/lib/Monad"
import type { TraversableWithIndex1 } from "fp-ts/lib/TraversableWithIndex"
import type { Unfoldable1 } from "fp-ts/lib/Unfoldable"
import type { Witherable1 } from "fp-ts/lib/Witherable"

import { URI } from "./URI"
import { alt_ } from "./alt_"
import { ap_ } from "./ap_"
import { chain_ } from "./chain_"
import { compact } from "./compact"
import { extend_ } from "./extend_"
import { filterMapWithIndex_ } from "./filterMapWithIndex_"
import { filterMap_ } from "./filterMap_"
import { filterWithIndex_ } from "./filterWithIndex_"
import { filter_ } from "./filter_"
import { foldMapWithIndex_ } from "./foldMapWithIndex_"
import { foldMap_ } from "./foldMap_"
import { mapWithIndex_ } from "./mapWithIndex_"
import { map_ } from "./map_"
import { of } from "./of"
import { partitionMapWithIndex_ } from "./partitionMapWithIndex_"
import { partitionMap_ } from "./partitionMap_"
import { partitionWithIndex_ } from "./partitionWithIndex_"
import { partition_ } from "./partition_"
import { reduceRightWithIndex_ } from "./reduceRightWithIndex_"
import { reduceRight_ } from "./reduceRight_"
import { reduceWithIndex_ } from "./reduceWithIndex_"
import { reduce_ } from "./reduce_"
import { separate } from "./separate"
import { sequence } from "./sequence"
import { traverse } from "./traverse"
import { traverseWithIndex } from "./traverseWithIndex"
import { unfold } from "./unfold"
import { wilt } from "./wilt"
import { wither } from "./wither"
import { zero } from "./zero"

/**
 * @since 2.5.0
 */
export const readonlyArray: Monad1<URI> &
  Foldable1<URI> &
  Unfoldable1<URI> &
  TraversableWithIndex1<URI, number> &
  Alternative1<URI> &
  Extend1<URI> &
  Compactable1<URI> &
  FilterableWithIndex1<URI, number> &
  Witherable1<URI> &
  FunctorWithIndex1<URI, number> &
  FoldableWithIndex1<URI, number> = {
  URI,
  map: map_,
  mapWithIndex: mapWithIndex_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_,
  of,
  ap: ap_,
  chain: chain_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  unfold,
  traverse,
  sequence,
  zero,
  alt: alt_,
  extend: extend_,
  wither,
  wilt,
  reduceWithIndex: reduceWithIndex_,
  foldMapWithIndex: foldMapWithIndex_,
  reduceRightWithIndex: reduceRightWithIndex_,
  traverseWithIndex,
  partitionMapWithIndex: partitionMapWithIndex_,
  partitionWithIndex: partitionWithIndex_,
  filterMapWithIndex: filterMapWithIndex_,
  filterWithIndex: filterWithIndex_
}
