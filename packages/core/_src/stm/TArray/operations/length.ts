import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * @tsplus fluent ets/TArray length
 */
export function length<A>(self: TArray<A>, __tsplusTrace?: string): number {
  concreteTArray(self);
  return self.chunk.length;
}
