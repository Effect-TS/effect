import type { Foldable1 } from "fp-ts/lib/Foldable"

import { URI } from "./URI"
import { foldMap_ } from "./foldMap_"
import { reduceRight_ } from "./reduceRight_"
import { reduce_ } from "./reduce_"

export const readonlyRecordFoldable: Foldable1<URI> = {
  URI,
  foldMap: foldMap_,
  reduce: reduce_,
  reduceRight: reduceRight_
}
