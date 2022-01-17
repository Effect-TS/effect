import type { Option } from "../../Option"
import { none, some } from "../../Option"
import type { Managed } from "../definition"
import { fold_ } from "./fold"

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 */
export function option<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, Option<A>> {
  return fold_(self, () => none, some, __trace)
}
