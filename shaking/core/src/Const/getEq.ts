import type { Eq } from "../Eq"
import { identity } from "../Function"

import type { Const } from "./Const"

/**
 * @since 2.0.0
 */
export const getEq: <E, A>(E: Eq<E>) => Eq<Const<E, A>> = identity
