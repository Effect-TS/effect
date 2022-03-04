import { STM } from "../../STM"
import { TRef } from "../../TRef"
import type { TArray } from "../definition"
import { InternalTArray } from "./_internal/InternalTArray"

/**
 * Makes a new `TArray` initialized with provided iterable.
 *
 * @tsplus static ets/TArrayOps fromIterable
 */
export function fromIterable<A>(it: Iterable<A>): STM<unknown, never, TArray<A>> {
  return STM.forEach(it, (a) => TRef.make(a)).map((as) => new InternalTArray(as))
}
