import type { Canceler, IO } from "../../Effect"
import { succeed } from "../../Effect/operations/succeed"
import type { Promise } from "../definition"
import { Pending } from "../state"

export function interruptJoiner_<E, A>(
  self: Promise<E, A>,
  joiner: (a: IO<E, A>) => void,
  __trace?: string
): Canceler<unknown> {
  return succeed(() => {
    const state = self.state

    if (state._tag === "Pending") {
      self.state = new Pending(state.joiners.filter((j) => j !== joiner))
    }
  }, __trace)
}

/**
 * @ets_data_first interruptJoiner_
 */
export function interruptJoiner<E, A>(joiner: (a: IO<E, A>) => void, __trace?: string) {
  return (self: Promise<E, A>): Canceler<unknown> =>
    interruptJoiner_(self, joiner, __trace)
}
