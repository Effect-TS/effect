import type { UIO } from "../../Effect/definition/base"
import { Fiber } from "../definition"

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 *
 * @tsplus fluent ets/Fiber mapFiber
 * @tsplus fluent ets/RuntimeFiber mapFiber
 */
export function mapFiber_<E, E1, A, B>(
  self: Fiber<E, A>,
  f: (a: A) => Fiber<E1, B>,
  __tsplusTrace?: string
): UIO<Fiber<E | E1, B>> {
  return self.await().map((exit) =>
    exit.fold(
      (cause): Fiber<E | E1, B> => Fiber.failCause(cause),
      (a) => f(a)
    )
  )
}

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 *
 * @ets_data_first mapFiber_
 */
export function mapFiber<E1, A, B>(f: (a: A) => Fiber<E1, B>, __tsplusTrace?: string) {
  return <E>(self: Fiber<E, A>): UIO<Fiber<E | E1, B>> => self.mapFiber(f)
}
