import { Effect } from "../Support/Common/effect"

import { as } from "./as"

/**
 * Curried form of as
 * @param b
 */
export function to<B>(
  b: B
): <S, R, E, A>(io: Effect<S, R, E, A>) => Effect<S, R, E, B> {
  return (io) => as(io, b)
}
