import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { unit } from "./unit"

/**
 * Ignores the result of the effect replacing it with a void
 */
export const asUnit = <S, R, E>(_: Effect<S, R, E, any>) => chain_(_, () => unit)
