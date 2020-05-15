import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import { partitionMapWithIndex as partitionMapWithIndex_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export function partitionMapWithIndex<K extends string, A, B, C>(
  f: (key: K, a: A) => Either<B, C>
): (fa: Record<K, A>) => Separated<Record<string, B>, Record<string, C>>
export function partitionMapWithIndex<A, B, C>(
  f: (key: string, a: A) => Either<B, C>
): (fa: Record<string, A>) => Separated<Record<string, B>, Record<string, C>> {
  return partitionMapWithIndex_1(f)
}
