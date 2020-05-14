import type { FilterableWithIndex2C } from "fp-ts/lib/FilterableWithIndex"

import { URI } from "./URI"
import { filterMapWithIndex_ } from "./filterMapWithIndex_"
import { filterWithIndex_ } from "./filterWithIndex_"
import { mapWithIndex_ } from "./mapWithIndex_"
import { partitionMapWithIndex_ } from "./partitionMapWithIndex_"
import { partitionWithIndex_ } from "./partitionWithIndex_"
import { readonlyMap } from "./readonlyMap"

/**
 * @since 2.5.0
 */
export function getFilterableWithIndex<K = never>(): FilterableWithIndex2C<URI, K, K> {
  return {
    ...readonlyMap,
    _E: undefined as any,
    mapWithIndex: mapWithIndex_,
    partitionMapWithIndex: partitionMapWithIndex_,
    partitionWithIndex: partitionWithIndex_,
    filterMapWithIndex: filterMapWithIndex_,
    filterWithIndex: filterWithIndex_
  }
}
