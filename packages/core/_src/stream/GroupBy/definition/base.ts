import type { _A, _E, _K, _R, _V } from "@effect/core/stream/GroupBy/definition/symbols";

export const GroupBySym = Symbol.for("@effect/core/stream/GroupBy");
export type GroupBySym = typeof GroupBySym;

/**
 * Representation of a grouped stream. This allows to filter which groups will
 * be processed. Once this is applied all groups will be processed in parallel
 * and the results will be merged in arbitrary order.
 *
 * @tsplus type ets/GroupBy
 */
export interface GroupBy<R, E, K, V, A> {
  readonly [GroupBySym]: GroupBySym;
  readonly [_R]: (_: R) => void;
  readonly [_E]: () => E;
  readonly [_K]: () => K;
  readonly [_V]: () => V;
  readonly [_A]: () => A;
}

/**
 * @tsplus type ets/GroupBy/Ops
 */
export interface GroupByOps {
  $: GroupByAspects;
}
export const GroupBy: GroupByOps = {
  $: {}
};

/**
 * @tsplus type ets/GroupBy/Aspects
 */
export interface GroupByAspects {}

export type UniqueKey = number;
