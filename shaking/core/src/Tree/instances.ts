/**
 * Multi-way trees (aka rose trees) and forests, where a forest is
 *
 * ```ts
 * type Forest<A> = Array<Tree<A>>
 * ```
 *
 * @since 2.0.0
 */

import type { Comonad1 } from "fp-ts/lib/Comonad"
import type { Foldable1 } from "fp-ts/lib/Foldable"
import type { Monad1 } from "fp-ts/lib/Monad"
import type { Traversable1 } from "fp-ts/lib/Traversable"

import { URI } from "./URI"
import { ap_ } from "./ap_"
import { chain_ } from "./chain_"
import { extend_ } from "./extend_"
import { extract_ } from "./extract_"
import { foldMap_ } from "./foldMap_"
import { map_ } from "./map_"
import { of_ } from "./of_"
import { reduceRight_ } from "./reduceRight_"
import { reduce_ } from "./reduce_"
import { sequence } from "./sequence"
import { traverse } from "./traverse"

/**
 * @since 2.0.0
 */
export const tree: Monad1<URI> & Foldable1<URI> & Traversable1<URI> & Comonad1<URI> = {
  URI,
  map: map_,
  of: of_,
  ap: ap_,
  chain: chain_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse,
  sequence,
  extract: extract_,
  extend: extend_
}
