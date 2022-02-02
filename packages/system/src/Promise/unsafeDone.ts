// ets_tracing: off

import type { IO } from "../Effect/effect"
import type { Promise } from "./promise"
import { Done } from "./state"

/**
 * Unsafe version of done
 */
export function unsafeDone<E, A>(io: IO<E, A>) {
  return (promise: Promise<E, A>) => {
    const state = promise.state.get

    if (state._tag === "Pending") {
      promise.state.set(new Done(io))

      Array.from(state.joiners)
        .reverse()
        .forEach((f) => {
          f(io)
        })
    }
  }
}
