// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Either } from "../../Either/index.js"
import { separate } from "./separate.js"

/**
 * Partition + Map
 *
 * @ets_data_first partitionMap_
 */
export function partitionMap<A, B, B1>(f: (a: A) => Either<B, B1>) {
  return (fa: O.Option<A>): Tp.Tuple<[O.Option<B>, O.Option<B1>]> =>
    partitionMap_(fa, f)
}

/**
 * Partition + Map
 */
export function partitionMap_<A, B, B1>(
  fa: O.Option<A>,
  f: (a: A) => Either<B, B1>
): Tp.Tuple<[O.Option<B>, O.Option<B1>]> {
  return separate(O.map_(fa, f))
}
