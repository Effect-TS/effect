import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * @tsplus getter effect/core/stm/TArray length
 * @category getters
 * @since 1.0.0
 */
export function length<A>(self: TArray<A>): number {
  concreteTArray(self)
  return self.chunk.length
}
