import { provideSome_ } from "./provideSome_"
import { Schedule } from "./schedule"

/**
 * Updates a service in the environment of this effect.
 */
export const updateService = <R0>(f: (r0: R0) => R0) => <S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>
) => provideSome_(self, (r: R & R0) => ({ ...r, ...f(r) }))

/**
 * Updates a service in the environment of this effect.
 */
export const updateService_ = <R0, S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  f: (r0: R0) => R0
) => provideSome_(self, (r: R & R0) => ({ ...r, ...f(r) }))
