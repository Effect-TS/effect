import { Option } from "../../../data/Option"
import type { Exit } from "../../../io/Exit"
import type { Stream } from "../definition"

/**
 * Terminates the stream when encountering the first `Exit.Failure`.
 *
 * @tsplus fluent ets/Stream collectWhileSuccess
 */
export function collectWhileSuccess<R, E, L, A>(
  self: Stream<R, E, Exit<L, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.collectWhile((exit) =>
    exit.isSuccess() ? Option.some(exit.value) : Option.none
  )
}
