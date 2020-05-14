import { identity } from "../Function"
import type { Monoid } from "../Monoid"

import type { Const } from "./Const"

/**
 * @since 2.6.0
 */
export const getMonoid: <E, A>(M: Monoid<E>) => Monoid<Const<E, A>> = identity as any
