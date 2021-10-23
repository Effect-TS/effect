// ets_tracing: off

import type * as O from "@effect-ts/system/Option"

import type { Predicate, Refinement } from "../../Function"
import type { Separated } from "../../Utils"
import { filter } from "./filter"

/**
 * Partition
 *
 * @ets_data_first partition_
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (fa: O.Option<A>) => Separated<O.Option<A>, O.Option<B>>
/**
 * Partition
 *
 * @ets_data_first partition_
 */
export function partition<A>(
  predicate: Predicate<A>
): (fa: O.Option<A>) => Separated<O.Option<A>, O.Option<A>>
/**
 * Partition
 *
 * @ets_data_first partition_
 */
export function partition<A>(
  predicate: Predicate<A>
): (fa: O.Option<A>) => Separated<O.Option<A>, O.Option<A>> {
  return (fa) => partition_(fa, predicate)
}

/**
 * Partition
 */
export function partition_<A, B extends A>(
  fa: O.Option<A>,
  refinement: Refinement<A, B>
): Separated<O.Option<A>, O.Option<B>>
/**
 * Partition
 */
export function partition_<A>(
  fa: O.Option<A>,
  predicate: Predicate<A>
): Separated<O.Option<A>, O.Option<A>>
/**
 * Partition
 */
export function partition_<A>(
  fa: O.Option<A>,
  predicate: Predicate<A>
): Separated<O.Option<A>, O.Option<A>> {
  return {
    left: filter((a: A) => !predicate(a))(fa),
    right: filter(predicate)(fa)
  }
}
