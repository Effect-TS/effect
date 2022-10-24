import { InternalTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Makes a new `TArray` initialized with provided `Collection`.
 *
 * @tsplus static effect/core/stm/TArray.Ops from
 * @category constructors
 * @since 1.0.0
 */
export function from<A>(it: Iterable<A>): STM<never, never, TArray<A>> {
  return STM.forEach(it, (a) => TRef.make(a)).map((as) => new InternalTArray(as))
}
