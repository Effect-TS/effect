/**
 * @since 2.0.0
 */
import { Foldable1 } from "fp-ts/lib/Foldable"

import { URI } from "./URI"
import { foldMap_ } from "./foldMap_"
import { reduceRight_ } from "./reduceRight_"
import { reduce_ } from "./reduce_"

/**
 * @since 2.0.0
 */
export const recordFoldable: Foldable1<URI> = {
  URI,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_
}
