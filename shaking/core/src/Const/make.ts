import { unsafeCoerce } from "../Function"

import type { Const } from "./Const"

/**
 * @since 2.0.0
 */

export const make: <E, A = never>(e: E) => Const<E, A> = unsafeCoerce
