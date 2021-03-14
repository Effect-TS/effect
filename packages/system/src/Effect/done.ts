// tracing: off

import type { Exit } from "../Exit/exit"
import { halt, succeed } from "./core"

/**
 * Returns an effect from a `Exit` value.
 */
export function done<E, A>(exit: Exit<E, A>, __trace?: string) {
  switch (exit._tag) {
    case "Success": {
      return succeed(exit.value, __trace)
    }
    case "Failure": {
      return halt(exit.cause, __trace)
    }
  }
}
