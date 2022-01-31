import type { Option } from "../../../data/Option"
import { Exit } from "../definition"

/**
 * @tsplus static ets/ExitOps fromOption
 */
export function fromOption<A>(option: Option<A>): Exit<void, A> {
  switch (option._tag) {
    case "None":
      return Exit.fail(undefined)
    case "Some":
      return Exit.succeed(option.value)
  }
}
