import * as A from "../Array"
import * as Fiber from "../Fiber"
import { fork } from "./core"
import type { AsyncR, Effect } from "./effect"
import { foreach_ } from "./foreach_"
import { map_ } from "./map_"

export function forkAll<S, R, E, A>(
  effects: Iterable<Effect<S, R, E, A>>
): AsyncR<R, Fiber.Fiber<E, readonly A[]>> {
  return map_(
    foreach_(effects, fork),
    A.reduce(Fiber.succeed([]) as Fiber.Fiber<E, readonly A[]>, (b, a) =>
      Fiber.zipWith_(b, a, (_a, _b) => [..._a, _b])
    )
  )
}
