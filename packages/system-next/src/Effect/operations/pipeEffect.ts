import type { Effect } from "../definition/base"

/**
 *@ets operator ets/Effect |
 */
export function pipeEffect<R, E, A, B>(
  self: Effect<R, E, A>,
  f: (a: Effect<R, E, A>) => B
) {
  return f(self)
}
