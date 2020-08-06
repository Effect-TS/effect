import { chain_, unit } from "./core"
import { Effect } from "./effect"

/**
 * Ignores the result of the effect replacing it with a void
 */
export const asUnit = <S, R, E>(_: Effect<S, R, E, any>) => chain_(_, () => unit)
