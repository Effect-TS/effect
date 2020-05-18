import { Effect, AsyncRE } from "../Support/Common/effect"

import { delay } from "./delay"

/**
 * Curried form of delay
 */
export function liftDelay(
  ms: number
): <S, R, E, A>(io: Effect<S, R, E, A>) => AsyncRE<R, E, A> {
  return (io) => delay(io, ms)
}
