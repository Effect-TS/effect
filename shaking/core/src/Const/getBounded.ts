import { identity } from "../Function"
import type { Bounded } from "../Ord"

import type { Const } from "./Const"

/**
 * @since 2.6.0
 */
export const getBounded: <E, A>(B: Bounded<E>) => Bounded<Const<E, A>> = identity as any
