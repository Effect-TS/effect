import * as Exit from "../Exit/api"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { IFold } from "./primitives"

/**
 * Returns an effect that semantically runs the effect on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 */
export function result<R, E, A>(
  value: Effect<R, E, A>
): Effect<R, never, Exit.Exit<E, A>> {
  return new IFold(
    value,
    (cause) => succeed(Exit.halt(cause)),
    (succ) => succeed(Exit.succeed(succ))
  )
}
