import { identity } from "../Function"
import type { Semigroup } from "../Semigroup"

import type { Const } from "./Const"

/**
 * @since 2.6.0
 */
export const getSemigroup: <E, A>(
  S: Semigroup<E>
) => Semigroup<Const<E, A>> = identity as any
