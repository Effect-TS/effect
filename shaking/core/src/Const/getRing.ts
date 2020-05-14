import type { Ring } from "fp-ts/lib/Ring"

import { identity } from "../Function"

import type { Const } from "./Const"

/**
 * @since 2.6.0
 */
export const getRing: <E, A>(S: Ring<E>) => Ring<Const<E, A>> = identity as any
