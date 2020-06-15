import { Exit } from "../Exit/exit"
import { halt as haltExit } from "../Exit/halt"
import { succeed as succeedExit } from "../Exit/succeed"

import { Effect } from "./effect"
import { IFold } from "./primitives"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect that semantically runs the effect on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 */
export const result = <S, R, E, A>(
  value: Effect<S, R, E, A>
): Effect<S, R, never, Exit<E, A>> =>
  new IFold(
    value,
    (cause) => succeedNow(haltExit(cause)),
    (succ) => succeedNow(succeedExit(succ))
  )
