import { Exit } from "../Exit/exit"

import { halt } from "./halt"
import { succeedNow } from "./succeedNow"
import { suspend } from "./suspend"

/**
 * Returns an effect from a `Exit` value.
 */
export const done = <E, A>(exit: Exit<E, A>) =>
  suspend(() => {
    switch (exit._tag) {
      case "Success": {
        return succeedNow(exit.value)
      }
      case "Failure": {
        return halt(exit.cause)
      }
    }
  })
