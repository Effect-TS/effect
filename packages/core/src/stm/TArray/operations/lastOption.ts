import { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * The last entry in the array, if it exists.
 *
 * @tsplus getter ets/TArray lastOption
 */
export function lastOption<A>(self: TArray<A>): USTM<Option<A>> {
  concrete(self)
  return self.chunk.isEmpty()
    ? STM.succeedNow(Option.none)
    : self.chunk.unsafeLast()!.get().map(Option.some)
}
