import type { Either } from "../../Either"
import type { Option } from "../../Option"
import type { Separated } from "../Compactable"
import type {
  CFilterable,
  CFilterable1,
  CFilterable2,
  CFilterable2C,
  CFilterable3,
  CFilterable3C,
  CFilterable4
} from "../Filterable"
import type {
  CFunctorWithIndex,
  CFunctorWithIndex1,
  CFunctorWithIndex2,
  CFunctorWithIndex2C,
  CFunctorWithIndex3,
  CFunctorWithIndex3C,
  CFunctorWithIndex4
} from "../FunctorWithIndex"
import type { HKT, Kind, Kind2, Kind3, Kind4, URIS, URIS2, URIS3, URIS4 } from "../HKT"

export type RefinementWithIndex<I, A, B extends A> = (i: I, a: A) => a is B
export type PredicateWithIndex<I, A> = (i: I, a: A) => boolean

export interface CFilterWithIndex<F, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): (
    fa: HKT<F, A>
  ) => HKT<F, B>
  <A>(predicate: PredicateWithIndex<I, A>): (fa: HKT<F, A>) => HKT<F, A>
}

export interface CPartitionWithIndex<F, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): (
    fa: HKT<F, A>
  ) => Separated<HKT<F, A>, HKT<F, B>>
  <A>(predicate: PredicateWithIndex<I, A>): (
    fa: HKT<F, A>
  ) => Separated<HKT<F, A>, HKT<F, A>>
}

export interface CFilterableWithIndex<F, I>
  extends CFunctorWithIndex<F, I>,
    CFilterable<F> {
  readonly partitionMapWithIndex: <A, B, C>(
    f: (i: I, a: A) => Either<B, C>
  ) => (fa: HKT<F, A>) => Separated<HKT<F, B>, HKT<F, C>>
  readonly partitionWithIndex: CPartitionWithIndex<F, I>
  readonly filterMapWithIndex: <A, B>(
    f: (i: I, a: A) => Option<B>
  ) => (fa: HKT<F, A>) => HKT<F, B>
  readonly filterWithIndex: CFilterWithIndex<F, I>
}

export interface CFilterWithIndex1<F extends URIS, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): (
    fa: Kind<F, A>
  ) => Kind<F, B>
  <A>(predicate: PredicateWithIndex<I, A>): (fa: Kind<F, A>) => Kind<F, A>
}

export interface CPartitionWithIndex1<F extends URIS, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): (
    fa: Kind<F, A>
  ) => Separated<Kind<F, A>, Kind<F, B>>
  <A>(predicate: PredicateWithIndex<I, A>): (
    fa: Kind<F, A>
  ) => Separated<Kind<F, A>, Kind<F, A>>
}

export interface CFilterableWithIndex1<F extends URIS, I>
  extends CFunctorWithIndex1<F, I>,
    CFilterable1<F> {
  readonly partitionMapWithIndex: <A, B, C>(
    f: (i: I, a: A) => Either<B, C>
  ) => (fa: Kind<F, A>) => Separated<Kind<F, B>, Kind<F, C>>
  readonly partitionWithIndex: CPartitionWithIndex1<F, I>
  readonly filterMapWithIndex: <A, B>(
    f: (i: I, a: A) => Option<B>
  ) => (fa: Kind<F, A>) => Kind<F, B>
  readonly filterWithIndex: CFilterWithIndex1<F, I>
}

export interface CFilterWithIndex2<F extends URIS2, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): <E>(
    fa: Kind2<F, E, A>
  ) => Kind2<F, E, B>
  <A>(predicate: PredicateWithIndex<I, A>): <E>(fa: Kind2<F, E, A>) => Kind2<F, E, A>
}

export interface CPartitionWithIndex2<F extends URIS2, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): <E>(
    fa: Kind2<F, E, A>
  ) => Separated<Kind2<F, E, A>, Kind2<F, E, B>>
  <A>(predicate: PredicateWithIndex<I, A>): <E>(
    fa: Kind2<F, E, A>
  ) => Separated<Kind2<F, E, A>, Kind2<F, E, A>>
}

export interface CFilterableWithIndex2<F extends URIS2, I>
  extends CFunctorWithIndex2<F, I>,
    CFilterable2<F> {
  readonly partitionMapWithIndex: <A, B, C>(
    f: (i: I, a: A) => Either<B, C>
  ) => <E>(fa: Kind2<F, E, A>) => Separated<Kind2<F, E, B>, Kind2<F, E, C>>
  readonly partitionWithIndex: CPartitionWithIndex2<F, I>
  readonly filterMapWithIndex: <A, B>(
    f: (i: I, a: A) => Option<B>
  ) => <E>(fa: Kind2<F, E, A>) => Kind2<F, E, B>
  readonly filterWithIndex: CFilterWithIndex2<F, I>
}

export interface CFilterWithIndex2C<F extends URIS2, I, E> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): (
    fa: Kind2<F, E, A>
  ) => Kind2<F, E, B>
  <A>(predicate: PredicateWithIndex<I, A>): (fa: Kind2<F, E, A>) => Kind2<F, E, A>
}

export interface CPartitionWithIndex2C<F extends URIS2, I, E> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): (
    fa: Kind2<F, E, A>
  ) => Separated<Kind2<F, E, A>, Kind2<F, E, B>>
  <A>(predicate: PredicateWithIndex<I, A>): (
    fa: Kind2<F, E, A>
  ) => Separated<Kind2<F, E, A>, Kind2<F, E, A>>
}

export interface CFilterableWithIndex2C<F extends URIS2, I, E>
  extends CFunctorWithIndex2C<F, I, E>,
    CFilterable2C<F, E> {
  readonly partitionMapWithIndex: <A, B, C>(
    f: (i: I, a: A) => Either<B, C>
  ) => (fa: Kind2<F, E, A>) => Separated<Kind2<F, E, B>, Kind2<F, E, C>>
  readonly partitionWithIndex: CPartitionWithIndex2C<F, I, E>
  readonly filterMapWithIndex: <A, B>(
    f: (i: I, a: A) => Option<B>
  ) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>
  readonly filterWithIndex: CFilterWithIndex2C<F, I, E>
}

export interface CFilterWithIndex3<F extends URIS3, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): <R, E>(
    fa: Kind3<F, R, E, A>
  ) => Kind3<F, R, E, B>
  <A>(predicate: PredicateWithIndex<I, A>): <R, E>(
    fa: Kind3<F, R, E, A>
  ) => Kind3<F, R, E, A>
}

export interface CPartitionWithIndex3<F extends URIS3, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): <R, E>(
    fa: Kind3<F, R, E, A>
  ) => Separated<Kind3<F, R, E, A>, Kind3<F, R, E, B>>
  <A>(predicate: PredicateWithIndex<I, A>): <R, E>(
    fa: Kind3<F, R, E, A>
  ) => Separated<Kind3<F, R, E, A>, Kind3<F, R, E, A>>
}

export interface CFilterableWithIndex3<F extends URIS3, I>
  extends CFunctorWithIndex3<F, I>,
    CFilterable3<F> {
  readonly partitionMapWithIndex: <A, B, C>(
    f: (i: I, a: A) => Either<B, C>
  ) => <R, E>(fa: Kind3<F, R, E, A>) => Separated<Kind3<F, R, E, B>, Kind3<F, R, E, C>>
  readonly partitionWithIndex: CPartitionWithIndex3<F, I>
  readonly filterMapWithIndex: <A, B>(
    f: (i: I, a: A) => Option<B>
  ) => <R, E>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
  readonly filterWithIndex: CFilterWithIndex3<F, I>
}

export interface CFilterWithIndex3C<F extends URIS3, I, E> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): <R>(
    fa: Kind3<F, R, E, A>
  ) => Kind3<F, R, E, B>
  <A>(predicate: PredicateWithIndex<I, A>): <R>(
    fa: Kind3<F, R, E, A>
  ) => Kind3<F, R, E, A>
}

export interface CPartitionWithIndex3C<F extends URIS3, I, E> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): <R>(
    fa: Kind3<F, R, E, A>
  ) => Separated<Kind3<F, R, E, A>, Kind3<F, R, E, B>>
  <A>(predicate: PredicateWithIndex<I, A>): <R>(
    fa: Kind3<F, R, E, A>
  ) => Separated<Kind3<F, R, E, A>, Kind3<F, R, E, A>>
}

export interface CFilterableWithIndex3C<F extends URIS3, I, E>
  extends CFunctorWithIndex3C<F, I, E>,
    CFilterable3C<F, E> {
  readonly partitionMapWithIndex: <A, B, C>(
    f: (i: I, a: A) => Either<B, C>
  ) => <R>(fa: Kind3<F, R, E, A>) => Separated<Kind3<F, R, E, B>, Kind3<F, R, E, C>>
  readonly partitionWithIndex: CPartitionWithIndex3C<F, I, E>
  readonly filterMapWithIndex: <A, B>(
    f: (i: I, a: A) => Option<B>
  ) => <R>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
  readonly filterWithIndex: CFilterWithIndex3C<F, I, E>
}

export interface CFilterWithIndex4<F extends URIS4, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): <S, R, E>(
    fa: Kind4<F, S, R, E, A>
  ) => Kind4<F, S, R, E, B>
  <A>(predicate: PredicateWithIndex<I, A>): <S, R, E>(
    fa: Kind4<F, S, R, E, A>
  ) => Kind4<F, S, R, E, A>
}

export interface CPartitionWithIndex4<F extends URIS4, I> {
  <A, B extends A>(refinement: RefinementWithIndex<I, A, B>): <S, R, E>(
    fa: Kind4<F, S, R, E, A>
  ) => Separated<Kind4<F, S, R, E, A>, Kind4<F, S, R, E, B>>
  <A>(predicate: PredicateWithIndex<I, A>): <S, R, E>(
    fa: Kind4<F, S, R, E, A>
  ) => Separated<Kind4<F, S, R, E, A>, Kind4<F, S, R, E, A>>
}

export interface CFilterableWithIndex4<F extends URIS4, I>
  extends CFunctorWithIndex4<F, I>,
    CFilterable4<F> {
  readonly partitionMapWithIndex: <A, B, C>(
    f: (i: I, a: A) => Either<B, C>
  ) => <S, R, E>(
    fa: Kind4<F, S, R, E, A>
  ) => Separated<Kind4<F, S, R, E, B>, Kind4<F, S, R, E, C>>
  readonly partitionWithIndex: CPartitionWithIndex4<F, I>
  readonly filterMapWithIndex: <A, B>(
    f: (i: I, a: A) => Option<B>
  ) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
  readonly filterWithIndex: CFilterWithIndex4<F, I>
}
