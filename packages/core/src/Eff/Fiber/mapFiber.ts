import { Async } from "../Effect/effect"
import { map_ } from "../Effect/map_"

import { Fiber } from "./fiber"
import { halt } from "./halt"

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber = <A, E2, A2>(f: (a: A) => Fiber<E2, A2>) => <E>(
  fiber: Fiber<E, A>
): Async<Fiber<E | E2, A2>> =>
  map_(fiber.wait, (e) => {
    switch (e._tag) {
      case "Success": {
        return f(e.value)
      }
      case "Failure": {
        return halt(e.cause)
      }
    }
  })
