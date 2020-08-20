import type { Exit } from "../Exit/exit"
import { halt, succeed, suspend } from "./core"

/**
 * Returns an effect from a `Exit` value.
 */
export const done = <E = never, A = unknown>(exit: Exit<E, A>) =>
  suspend(() => {
    switch (exit._tag) {
      case "Success": {
        return succeed(exit.value)
      }
      case "Failure": {
        return halt(exit.cause)
      }
    }
  })
