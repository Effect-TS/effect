import type { LazyArg } from "../../Function"
import type { UIO } from "../definition"
import { ISucceed } from "../definition"

/**
 * Returns an effect that models success with the specified synchronous
 * side-effect.
 */
export function succeed<A>(f: LazyArg<A>, __trace?: string): UIO<A> {
  return new ISucceed(f, __trace)
}
