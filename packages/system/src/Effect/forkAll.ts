import * as A from "../Array"
import * as Fiber from "../Fiber"
import * as I from "../Iterable"
import { chain_, fork, unit } from "./core"
import type { Effect, RIO } from "./effect"
import { foreach_ } from "./foreach"
import { map_ } from "./map"

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 */
export function forkAll<R, E, A>(
  effects: Iterable<Effect<R, E, A>>
): RIO<R, Fiber.Fiber<E, readonly A[]>> {
  return map_(
    foreach_(effects, fork),
    A.reduce(Fiber.succeed([]) as Fiber.Fiber<E, readonly A[]>, (b, a) =>
      Fiber.zipWith_(b, a, (_a, _b) => [..._a, _b])
    )
  )
}

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than [[forkAll]]
 * in cases where the results of the forked fibers are not needed.
 */
export function forkAllUnit<R, E, A>(effects: Iterable<Effect<R, E, A>>) {
  return I.reduce_(effects, unit as RIO<R, void>, (b, a) => chain_(fork(a), () => b))
}
