import { InternalTArray } from "@effect-ts/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * Makes a new `TArray` initialized with provided `Collection`.
 *
 * @tsplus static ets/TArray/Ops from
 */
export function from<A>(it: LazyArg<Collection<A>>): STM<unknown, never, TArray<A>> {
  return STM.forEach(it, (a) => TRef.make(a)).map((as) => new InternalTArray(as));
}
