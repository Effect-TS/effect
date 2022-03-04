import type { STM } from "../../STM"
import { TArray } from "../definition"

/**
 * Makes a new `TArray` that is initialized with specified values.
 *
 * @tsplus static ets/TArrayOps __call
 */
export function make<ARGS extends any[]>(
  ...data: ARGS
): STM<unknown, never, TArray<ARGS[number]>> {
  return TArray.fromIterable(data)
}
