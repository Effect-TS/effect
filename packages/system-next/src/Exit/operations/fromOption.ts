// ets_tracing: off

import type { Option } from "../../Option"
import type { Exit } from "../definition"
import { fail } from "./fail"
import { succeed } from "./succeed"

export function fromOption<A>(option: Option<A>): Exit<void, A> {
  switch (option._tag) {
    case "None":
      return fail(undefined)
    case "Some":
      return succeed(option.value)
  }
}
