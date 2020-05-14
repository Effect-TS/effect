/**
 * The `Const` type constructor, which wraps its first type argument and ignores its second.
 * That is, `Const<E, A>` is isomorphic to `E` for any `A`.
 *
 * `Const` has some useful instances. For example, the `Applicative` instance allows us to collect results using a `Monoid`
 * while ignoring return values.
 *
 * @since 2.0.0
 */
import type { Bifunctor2 } from "fp-ts/lib/Bifunctor"
import type { Contravariant2 } from "fp-ts/lib/Contravariant"
import type { Functor2 } from "fp-ts/lib/Functor"

import { URI } from "./URI"
import { bimap_ } from "./bimap_"
import { contramap_ } from "./contramap_"
import { mapLeft_ } from "./mapLeft_"
import { map_ } from "./map_"

/**
 * @since 2.0.0
 */
export const const_: Functor2<URI> & Contravariant2<URI> & Bifunctor2<URI> = {
  URI,
  map: map_,
  contramap: contramap_,
  bimap: bimap_,
  mapLeft: mapLeft_
}
