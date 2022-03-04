import { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * The first entry of the array, if it exists.
 *
 * @tsplus getter ets/TArray firstOption
 */
export function firstOption<A>(self: TArray<A>): USTM<Option<A>> {
  concrete(self)
  return self.chunk.isEmpty()
    ? STM.succeedNow(Option.none)
    : self.chunk.unsafeHead()!.get().map(Option.some)
}
