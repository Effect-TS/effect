import type { BooleanAlgebra } from "fp-ts/lib/BooleanAlgebra"

import { identity } from "../Function"

import type { Const } from "./Const"

/**
 * @since 2.6.0
 */
export const getBooleanAlgebra: <E, A>(
  H: BooleanAlgebra<E>
) => BooleanAlgebra<Const<E, A>> = identity as any
