import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { partitionMapWithIndex_ } from "./partitionMapWithIndex_"

/**
 * @since 2.5.0
 */
export function partitionMapWithIndex<K extends string, A, B, C>(
  f: (key: K, a: A) => Either<B, C>
): (
  fa: ReadonlyRecord<K, A>
) => Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>>
export function partitionMapWithIndex<A, B, C>(
  f: (key: string, a: A) => Either<B, C>
): (
  fa: ReadonlyRecord<string, A>
) => Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> {
  return (fa) => partitionMapWithIndex_(fa, f)
}
