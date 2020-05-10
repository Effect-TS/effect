import type { Alternative1 } from "fp-ts/lib/Alternative"
import type { Compactable1 } from "fp-ts/lib/Compactable"
import type { Extend1 } from "fp-ts/lib/Extend"
import type { Filterable1 } from "fp-ts/lib/Filterable"
import type { Foldable1 } from "fp-ts/lib/Foldable"
import type { Monad1 } from "fp-ts/lib/Monad"
import type { MonadThrow1 } from "fp-ts/lib/MonadThrow"
import type { Traversable1 } from "fp-ts/lib/Traversable"
import type { Witherable1 } from "fp-ts/lib/Witherable"

import { alt_ } from "./alt_"
import { ap_ } from "./ap_"
import { chain_ } from "./chain_"
import { URI } from "./common"
import { compact } from "./compact"
import { extend_ } from "./extend_"
import { filterMap_ } from "./filterMap_"
import { filter_ } from "./filter_"
import { foldMap_ } from "./foldMap_"
import { map_ } from "./map_"
import { partitionMap_ } from "./partitionMap_"
import { partition_ } from "./partition_"
import { reduceRight_ } from "./reduceRight_"
import { reduce_ } from "./reduce_"
import { separate } from "./separate"
import { sequence } from "./sequence"
import { some } from "./some"
import { throwError } from "./throwError"
import { traverse } from "./traverse"
import { wilt } from "./wilt"
import { wither } from "./wither"
import { zero } from "./zero"

/**
 * @since 2.0.0
 */
export const option: Monad1<URI> &
  Foldable1<URI> &
  Traversable1<URI> &
  Alternative1<URI> &
  Extend1<URI> &
  Compactable1<URI> &
  Filterable1<URI> &
  Witherable1<URI> &
  MonadThrow1<URI> = {
  URI: "Option",
  map: map_,
  of: some,
  ap: ap_,
  chain: chain_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse,
  sequence,
  zero,
  alt: alt_,
  extend: extend_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_,
  wither,
  wilt,
  throwError
}
