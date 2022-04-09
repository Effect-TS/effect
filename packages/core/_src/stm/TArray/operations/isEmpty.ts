import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * Checks if the array is empty.
 *
 * @tsplus fluent ets/TArray isEmpty
 */
export function isEmpty<A>(self: TArray<A>): boolean {
  concreteTArray(self);
  return self.chunk.length <= 0;
}
