import { identity } from "../Function"
import type { Ord } from "../Ord"

import type { Const } from "./Const"

/**
 * @since 2.6.0
 */
export const getOrd: <E, A>(O: Ord<E>) => Ord<Const<E, A>> = identity
