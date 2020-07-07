import * as C from "../Cause"

import { Exit } from "./exit"
import { halt } from "./halt"
import { succeed } from "./succeed"

/**
 * Zips this together with the specified result using the combination functions.
 */
export const zipWith_ = <E, E1, A, B, C>(
  exit: Exit<E, A>,
  that: Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (e: C.Cause<E>, e1: C.Cause<E1>) => C.Cause<E | E1>
): Exit<E | E1, C> => {
  switch (exit._tag) {
    case "Failure": {
      switch (that._tag) {
        case "Success": {
          return exit
        }
        case "Failure": {
          return halt(g(exit.cause, that.cause))
        }
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "Success": {
      switch (that._tag) {
        case "Success": {
          return succeed(f(exit.value, that.value))
        }
        case "Failure": {
          return that
        }
      }
    }
  }
}
