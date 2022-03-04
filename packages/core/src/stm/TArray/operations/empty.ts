import type { STM } from "../../STM"
import { TArray } from "../definition"

/**
 * Makes a new `TArray` that is initialized with specified values.
 *
 * @tsplus static ets/TArrayOps empty
 */
export function empty<A>(): STM<unknown, never, TArray<A>> {
  return TArray.fromIterable<A>([])
}
