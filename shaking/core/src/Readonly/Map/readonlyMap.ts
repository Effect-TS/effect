/**
 * @since 2.5.0
 */
import type { Filterable2 } from "fp-ts/lib/Filterable"

import { URI } from "./URI"
import { compact } from "./compact"
import { filterMap_ } from "./filterMap_"
import { filter_ } from "./filter_"
import { map_ } from "./map_"
import { partitionMap_ } from "./partitionMap_"
import { partition_ } from "./partition_"
import { separate } from "./separate"

/**
 * @since 2.5.0
 */
export const readonlyMap: Filterable2<URI> = {
  URI,
  map: map_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_
}
