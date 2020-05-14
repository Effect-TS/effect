import { Eq } from "../Eq"
import { Monoid } from "../Monoid"
import * as RM from "../Readonly/Map/getMonoid"
import { Semigroup } from "../Semigroup"

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 *
 * @since 2.0.0
 */
export const getMonoid: <K, A>(
  SK: Eq<K>,
  SA: Semigroup<A>
) => Monoid<Map<K, A>> = RM.getMonoid as any
