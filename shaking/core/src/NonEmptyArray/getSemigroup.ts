import { getSemigroup as getSemigroup_1 } from "../Readonly/NonEmptyArray/getSemigroup"
import type { Semigroup } from "../Semigroup"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * Builds a `Semigroup` instance for `NonEmptyArray`
 *
 * @since 2.0.0
 */
export const getSemigroup: <A = never>() => Semigroup<
  NonEmptyArray<A>
> = getSemigroup_1 as any
