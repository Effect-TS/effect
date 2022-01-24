import type { Fiber } from "../definition"
import * as T from "./_internal/effect-api"
import { done } from "./done"

/**
 * Lifts an `Effect` into a `Fiber`.
 */
export function fromEffect<E, A>(
  effect: T.IO<E, A>,
  __trace?: string
): T.UIO<Fiber<E, A>> {
  return T.map_(T.exit(effect), done)
}
