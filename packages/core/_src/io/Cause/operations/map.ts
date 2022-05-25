import { Fail } from "@effect/core/io/Cause/definition"

/**
 * Transforms the error type of this cause with the specified function.
 *
 * @tsplus fluent ets/Cause map
 */
export function map_<E, E1>(self: Cause<E>, f: (e: E) => E1): Cause<E1> {
  return self.flatMap((e) => new Fail(f(e), Trace.none))
}

/**
 * Transforms the error type of this cause with the specified function.
 *
 * @tsplus static ets/Cause/Aspects map
 */
export const map = Pipeable(map_)
