import type { Canceler, IO } from "../../../Effect"
import { Effect } from "../../../Effect"
import { PromiseState } from "../../_internal/state"
import type { Promise } from "../../definition"

export function interruptJoiner<E, A>(
  self: Promise<E, A>,
  joiner: (a: IO<E, A>) => void,
  __tsplusTrace?: string
): Canceler<unknown> {
  return Effect.succeed(() => {
    const state = self.state.get
    if (state._tag === "Pending") {
      self.state.set(PromiseState.pending(state.joiners.filter((j) => j !== joiner)))
    }
  })
}
