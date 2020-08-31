import { cons_ } from "../Array"
import type { AsyncE, Canceler } from "../Effect"
import { effectMaybeAsyncInterrupt } from "../Effect"
import type { Either } from "../Either"
import { left, right } from "../Either"
import { absurd, pipe } from "../Function"
import { interruptJoiner } from "./interruptJoiner"
import type { Promise } from "./promise"
import type { State } from "./state"
import { Pending } from "./state"

/**
 * Retrieves the value of the promise, suspending the fiber running the action
 * until the result is available.
 */
function await_<E, A>(p: Promise<E, A>): AsyncE<E, A> {
  // this function is implemented with do-while loop and explicit switch
  // statement for TypeScript compiler to properly figure out variables
  // `result`, `retry`, and `newState` without forced casts.
  return effectMaybeAsyncInterrupt<unknown, E, A>((k) => {
    let result: Either<Canceler<unknown>, AsyncE<E, A>>
    let retry: boolean

    do {
      const oldState = p.state.get
      let newState: State<E, A>

      switch (oldState._tag) {
        case "Pending":
          result = pipe(p, interruptJoiner(k), left)
          newState = new Pending(cons_(oldState.joiners, k))
          break
        case "Done":
          result = right(oldState.value)
          newState = oldState
          break
        default:
          absurd(oldState)
      }

      retry = !p.state.compareAndSet(oldState, newState)
    } while (retry)

    return result
  }, p.blockingOn)
}

export { await_ as await }
