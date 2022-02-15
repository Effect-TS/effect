import type { Effect } from "../definition/base"

/**
 * @tsplus operator ets/Effect >=
 * @tsplus fluent ets/Effect apply
 */
export function pipeEffect<R, E, A, B>(
  self: Effect<R, E, A>,
  f: (a: Effect<R, E, A>) => B
) {
  return f(self)
}
