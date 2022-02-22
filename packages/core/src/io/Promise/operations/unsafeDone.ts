import type { IO } from "../../Effect"
import { PromiseState } from "../_internal/state"
import type { Promise } from "../definition"

/**
 * Unsafe version of `done`.
 *
 * @tsplus fluent ets/Promise unsafeDone
 */
export function unsafeDone_<E, A>(self: Promise<E, A>, effect: IO<E, A>): void {
  const state = self.state.get
  if (state._tag === "Pending") {
    self.state.set(PromiseState.done(effect))
    Array.from(state.joiners)
      .reverse()
      .forEach((f) => {
        f(effect)
      })
  }
}

/**
 * Unsafe version of `done`.
 *
 * @ets_data_first unsafeDone_
 */
export function unsafeDone<E, A>(effect: IO<E, A>) {
  return (self: Promise<E, A>): void => unsafeDone_(self, effect)
}
