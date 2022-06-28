import { Fail } from "@effect/core/io/Cause/definition"

/**
 * Transforms the error type of this cause with the specified function.
 *
 * @tsplus fluent effect/core/io/Cause.Aspects map
 * @tsplus pipeable effect/core/io/Cause map
 */
export function map<E, E1>(f: (e: E) => E1) {
  return (self: Cause<E>): Cause<E1> => self.flatMap((e) => new Fail(f(e), Trace.none))
}
