import type { HeytingAlgebra } from "fp-ts/lib/HeytingAlgebra"

import { identity } from "../Function"

import type { Const } from "./Const"

/**
 * @since 2.6.0
 */
export const getHeytingAlgebra: <E, A>(
  H: HeytingAlgebra<E>
) => HeytingAlgebra<Const<E, A>> = identity as any
