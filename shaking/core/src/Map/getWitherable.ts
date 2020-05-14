import type { TraversableWithIndex2C } from "fp-ts/lib/TraversableWithIndex"
import type { Witherable2C } from "fp-ts/lib/Witherable"

import type { Ord } from "../Ord"
import * as RM from "../Readonly/Map/getWitherable"

import { URI } from "./URI"

/**
 * @since 2.0.0
 */
export const getWitherable: <K>(
  O: Ord<K>
) => Witherable2C<URI, K> & TraversableWithIndex2C<URI, K, K> = RM.getWitherable as any
