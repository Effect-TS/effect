// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Exit } from "../definition"
import { failCause } from "./failCause"
import { succeed } from "./succeed"

/**
 * Zips this together with the specified result using the combination
 * functions.
 */
export function zipWith_<E, E1, A, B, C>(
  self: Exit<E, A>,
  that: Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (e: Cause<E>, e1: Cause<E1>) => Cause<E | E1>
): Exit<E | E1, C> {
  switch (self._tag) {
    case "Failure": {
      switch (that._tag) {
        case "Success": {
          return self
        }
        case "Failure": {
          return failCause(g(self.cause, that.cause))
        }
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "Success": {
      switch (that._tag) {
        case "Success": {
          return succeed(f(self.value, that.value))
        }
        case "Failure": {
          return that
        }
      }
    }
  }
}

/**
 * Zips this together with the specified result using the combination
 * functions.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<E1, B, A, C, E>(
  that: Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (e: Cause<E>, e1: Cause<E1>) => Cause<E | E1>
) {
  return (self: Exit<E, A>): Exit<E | E1, C> => zipWith_(self, that, f, g)
}
