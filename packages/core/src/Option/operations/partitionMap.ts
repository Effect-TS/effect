// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Either } from "../../Either"
import type { Separated } from "../../Utils"
import { separate } from "./separate"

/**
 * Partition + Map
 *
 * @ets_data_first partitionMap_
 */
export function partitionMap<A, B, B1>(f: (a: A) => Either<B, B1>) {
  return (fa: O.Option<A>): Separated<O.Option<B>, O.Option<B1>> => partitionMap_(fa, f)
}

/**
 * Partition + Map
 */
export function partitionMap_<A, B, B1>(
  fa: O.Option<A>,
  f: (a: A) => Either<B, B1>
): Separated<O.Option<B>, O.Option<B1>> {
  return separate(O.map_(fa, f))
}
