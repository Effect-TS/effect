import type { Eq } from "../Eq"
import { identity as id } from "../Function"

import type { Identity } from "./Identity"

/**
 * @since 2.0.0
 */
export const getEq: <A>(E: Eq<A>) => Eq<Identity<A>> = id
