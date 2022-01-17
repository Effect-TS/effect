import type { Option } from "../../Option"
import { fold, none } from "../../Option"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { failNow } from "./failNow"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"

/**
 * Lifts an `Option` into a `Managed` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 */
export function fromOption<A>(
  option: Option<A>,
  __trace?: string
): Managed<unknown, Option<never>, A> {
  return chain_(
    succeed(() => option),
    fold(() => failNow(none), succeedNow),
    __trace
  )
}
