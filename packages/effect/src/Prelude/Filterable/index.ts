import type { Either } from "../../Classic/Either"
import type { Option } from "../../Classic/Option"
import type { Predicate, Refinement } from "../../Function"
import type { Separated } from "../../Utils"
import type { Compactable } from "../Compactable"
import type { Covariant } from "../Covariant"
import type * as HKT from "../HKT"

export interface Filterable<F extends HKT.URIS, C = HKT.Auto>
  extends Covariant<F, C>,
    Compactable<F, C> {
  readonly filter: Filter<F, C>
  readonly partition: Partition<F, C>
  readonly filterMap: FilterMap<F, C>
  readonly partitionMap: PartitionMap<F, C>
}

export interface Filter<F extends HKT.URIS, C = HKT.Auto> {
  <A, B extends A>(refinement: Refinement<A, B>): <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <A>(predicate: Predicate<A>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface Partition<F extends HKT.URIS, C = HKT.Auto> {
  <A, B extends A>(refinement: Refinement<A, B>): <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  >
  <A>(predicate: Predicate<A>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
  >
}

export interface FilterMap<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: A) => Option<B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}

export interface PartitionMap<F extends HKT.URIS, C = HKT.Auto> {
  <A, B, C>(f: (a: A) => Either<B, C>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, C>
  >
}
