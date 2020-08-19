import { Canceler } from "../Effect/Canceler"
import { effectTotal } from "../Effect/core"
import { AsyncE } from "../Effect/effect"

import { Promise } from "./promise"
import { Pending } from "./state"

export const interruptJoiner = <E, A>(joiner: (a: AsyncE<E, A>) => void) => (
  promise: Promise<E, A>
): Canceler<unknown> =>
  effectTotal(() => {
    const state = promise.state.get

    if (state._tag === "Pending") {
      promise.state.set(new Pending(state.joiners.filter((j) => j !== joiner)))
    }
  })
