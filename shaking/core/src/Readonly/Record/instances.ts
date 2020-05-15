/**
 * @since 2.5.0
 */
import type { Compactable1 } from "fp-ts/lib/Compactable"
import type { FilterableWithIndex1 } from "fp-ts/lib/FilterableWithIndex"
import type { Foldable1 } from "fp-ts/lib/Foldable"
import type { FoldableWithIndex1 } from "fp-ts/lib/FoldableWithIndex"
import type { FunctorWithIndex1 } from "fp-ts/lib/FunctorWithIndex"
import { sequence } from "fp-ts/lib/ReadonlyRecord"
import type { TraversableWithIndex1 } from "fp-ts/lib/TraversableWithIndex"
import type { Witherable1 } from "fp-ts/lib/Witherable"

import { URI } from "./URI"
import { compact } from "./compact"
import { filterMapWithIndex_ } from "./filterMapWithIndex_"
import { filterMap_ } from "./filterMap_"
import { filterWithIndex_ } from "./filterWithIndex_"
import { filter_ } from "./filter_"
import { foldMapWithIndex_ } from "./foldMapWithIndex_"
import { foldMap_ } from "./foldMap_"
import { mapWithIndex_ } from "./mapWithIndex_"
import { map_ } from "./map_"
import { partitionMapWithIndex_ } from "./partitionMapWithIndex_"
import { partitionMap_ } from "./partitionMap_"
import { partitionWithIndex_ } from "./partitionWithIndex_"
import { partition_ } from "./partition_"
import { reduceRightWithIndex_ } from "./reduceRightWithIndex_"
import { reduceRight_ } from "./reduceRight_"
import { reduceWithIndex_ } from "./reduceWithIndex_"
import { reduce_ } from "./reduce_"
import { separate } from "./separate"
import { traverseWithIndex_ } from "./traverseWithIndex_"
import { traverse_ } from "./traverse_"
import { wilt } from "./wilt"
import { wither } from "./wither"

/**
 * @since 2.5.0
 */
export const readonlyRecord: FunctorWithIndex1<URI, string> &
  Foldable1<URI> &
  TraversableWithIndex1<URI, string> &
  Compactable1<URI> &
  FilterableWithIndex1<URI, string> &
  Witherable1<URI> &
  FoldableWithIndex1<URI, string> = {
  URI,
  map: map_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse: traverse_,
  sequence,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_,
  wither,
  wilt,
  mapWithIndex: mapWithIndex_,
  reduceWithIndex: reduceWithIndex_,
  foldMapWithIndex: foldMapWithIndex_,
  reduceRightWithIndex: reduceRightWithIndex_,
  traverseWithIndex: traverseWithIndex_,
  partitionMapWithIndex: partitionMapWithIndex_,
  partitionWithIndex: partitionWithIndex_,
  filterMapWithIndex: filterMapWithIndex_,
  filterWithIndex: filterWithIndex_
}
