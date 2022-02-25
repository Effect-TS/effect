import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import type { Managed } from "../definition"
import { fromEffect } from "./fromEffect"

/**
 * Lifts a synchronous side-effect into a `Managed[R, E, A]`,
 * translating any thrown exceptions into typed failed effects using onThrow.
 *
 * @tsplus static ets/ManagedOps tryCatch
 */
export function tryCatch<E, A>(
  f: LazyArg<A>,
  onThrow: (u: unknown) => E,
  __tsplusTrace?: string
): Managed<unknown, E, A> {
  return fromEffect(Effect.tryCatch(f, onThrow))
}
