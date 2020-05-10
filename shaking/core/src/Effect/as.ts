import { Effect } from "../Support/Common/effect"

import { map_ } from "./map"

/**
 * Map the value produced by an IO to the constant b
 * @param io
 * @param b
 */
export function as<S, R, E, A, B>(io: Effect<S, R, E, A>, b: B): Effect<S, R, E, B> {
  return map_(io, () => b)
}
