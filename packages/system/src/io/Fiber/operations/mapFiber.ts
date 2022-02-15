import type { UIO } from "../../Effect/definition/base"
import type { Fiber } from "../definition"
import { failCause } from "./failCause"

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export function mapFiber_<E, E1, A, B>(
  self: Fiber<E, A>,
  f: (a: A) => Fiber<E1, B>,
  __etsTrace?: string
): UIO<Fiber<E | E1, B>> {
  return self.await.map((exit) => {
    switch (exit._tag) {
      case "Success": {
        return f(exit.value)
      }
      case "Failure": {
        return failCause(exit.cause)
      }
    }
  })
}

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 *
 * @ets_data_first mapFiber_
 */
export function mapFiber<E1, A, B>(f: (a: A) => Fiber<E1, B>, __etsTrace?: string) {
  return <E>(self: Fiber<E, A>): UIO<Fiber<E | E1, B>> => mapFiber_(self, f)
}
