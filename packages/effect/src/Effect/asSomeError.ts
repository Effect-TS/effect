import * as O from "../Option"
import type { Effect } from "./effect"
import { mapError_ } from "./mapError_"

/**
 * Maps the error value of this effect to an optional value.
 */
export const asSomeError = <S, R, E, E2, A>(self: Effect<S, R, E, A>) =>
  mapError_(self, (e) => O.some(e))
