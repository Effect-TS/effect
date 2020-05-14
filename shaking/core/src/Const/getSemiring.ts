import type { Semiring } from "fp-ts/lib/Semiring"

import { identity } from "../Function"

import type { Const } from "./Const"

/**
 * @since 2.6.0
 */
export const getSemiring: <E, A>(
  S: Semiring<E>
) => Semiring<Const<E, A>> = identity as any
