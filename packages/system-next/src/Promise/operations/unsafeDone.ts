// ets_tracing: off

import type { IO } from "../../Effect"
import type { Promise } from "../definition"
import { Done } from "../state"

/**
 * Unsafe version of `done`.
 */
export function unsafeDone_<E, A>(self: Promise<E, A>, io: IO<E, A>): void {
  const state = self.state.get

  if (state._tag === "Pending") {
    self.state.set(new Done(io))

    Array.from(state.joiners)
      .reverse()
      .forEach((f) => {
        f(io)
      })
  }
}

/**
 * Unsafe version of `done`.
 *
 * @ets_data_first unsafeDone_
 */
export function unsafeDone<E, A>(io: IO<E, A>) {
  return (self: Promise<E, A>) => unsafeDone_(self, io)
}
