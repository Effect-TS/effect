import {} from "fp-ts-contrib/lib/Do";
import { Bifunctor4 } from "fp-ts/lib/Bifunctor";
import { Compactable4 } from "fp-ts/lib/Compactable";
import { Contravariant4 } from "fp-ts/lib/Contravariant";
import { Either } from "fp-ts/lib/Either";
import { Extend4 } from "fp-ts/lib/Extend";
import { Filterable4 } from "fp-ts/lib/Filterable";
import { FilterableWithIndex4 } from "fp-ts/lib/FilterableWithIndex";
import { Foldable4 } from "fp-ts/lib/Foldable";
import { FoldableWithIndex4 } from "fp-ts/lib/FoldableWithIndex";
import { Predicate, Refinement } from "fp-ts/lib/function";
import { Functor4 } from "fp-ts/lib/Functor";
import { FunctorWithIndex4 } from "fp-ts/lib/FunctorWithIndex";
import { Kind4 } from "fp-ts/lib/HKT";
import { Option } from "fp-ts/lib/Option";
import { PipeableFunctor4 } from "fp-ts/lib/pipeable";
import { Profunctor4 } from "fp-ts/lib/Profunctor";
import { Semigroupoid4 } from "fp-ts/lib/Semigroupoid";
import { NoEnv, NoErr } from "./effect";
import { URI as EffURI, RT } from "./eff";

// WIP
/* istanbul ignore file */

export interface Apply4E<F extends EffURI> extends Functor4<F> {
  readonly ap: <S1, S2, R, E, A, B, R2, E2>(
    fab: Kind4<F, S1, R, E, (a: A) => B>,
    fa: Kind4<F, S2, R2, E2, A>
  ) => RT<unknown, R & R2, E | E2, B>;
}

export interface Chain4E<F extends EffURI> extends Apply4E<F> {
  readonly chain: <S1, S2, R, E, A, R2, E2, B>(
    fa: Kind4<F, S1, R, E, A>,
    f: (a: A) => Kind4<F, S2, R2, E2, B>
  ) => RT<S1 | S2, R & R2, E | E2, B>;
}

export interface Applicative4E<F extends EffURI> extends Apply4E<F> {
  readonly of: <S, R, E, A>(a: A) => Kind4<F, S, R, E, A>;
}

export interface Alt4E<F extends EffURI> extends Functor4<F> {
  readonly alt: <S1, S2, R, R2, E, E2, A>(
    fx: Kind4<F, S1, R, E, A>,
    fy: () => Kind4<F, S2, R2, E2, A>
  ) => RT<S1 | S2, R & R2, E2, A>;
}

export interface Monad4E<M extends EffURI> extends Applicative4E<M>, Chain4E<M> {}

export interface Monad4EC<M extends EffURI, E> extends Applicative4EC<M, E>, Chain4EC<M, E> {}

export interface Applicative4EC<F extends EffURI, E> extends Apply4EC<F, E> {
  readonly of: <S, R, A>(a: A) => RT<S, R, E, A>;
}

export interface Apply4EC<F extends EffURI, E> extends Functor4EC<F, E> {
  readonly ap: <S1, S2, R, R2, A, B>(
    fab: Kind4<F, S1, R, E, (a: A) => B>,
    fa: Kind4<F, S2, R2, E, A>
  ) => RT<S1 | S2, R & R2, E, B>;
}

export interface Chain4EC<F extends EffURI, E> extends Apply4EC<F, E> {
  readonly chain: <S1, S2, R, A, R2, B>(
    fa: Kind4<F, S1, R, E, A>,
    f: (a: A) => Kind4<F, S2, R2, E, B>
  ) => RT<S1 | S2, R & R2, E, B>;
}

export interface Functor4EC<F extends EffURI, E> {
  readonly URI: F;
  readonly _E: E;
  readonly map: <S, R, A, B>(fa: Kind4<F, S, R, E, A>, f: (a: A) => B) => RT<S, R, E, B>;
}

declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

interface GenEffect<S, R, E, A> {
  _TAG: () => "Eff";
  _E: () => E;
  _A: () => A;
  _S: () => S;
  _R: (_: R) => void;
}

export type STypeOf<X> = X extends GenEffect<infer S, infer R, infer E, infer A> ? S : never;

export type ATypeOf<X> = X extends GenEffect<infer S, infer R, infer E, infer A> ? A : never;

export type ETypeOf<X> = X extends GenEffect<infer S, infer R, infer E, infer A> ? E : never;

export type RTypeOf<X> = X extends GenEffect<infer S, infer R, infer E, infer A> ? R : never;

export type EnvOf<R extends Record<string, GenEffect<any, any, any, any>>> = UnionToIntersection<
  {
    [K in keyof R]: unknown extends RTypeOf<R[K]> ? never : RTypeOf<R[K]>;
  }[keyof R]
>;

export type SOf<R extends Record<string, GenEffect<any, any, any, any>>> = {
  [K in keyof R]: STypeOf<R[K]>;
}[keyof R];

export interface Do4CE<M extends EffURI, Q, S extends object, U, L> {
  do: <Q1, E, R>(ma: Kind4<M, Q1, R, E, unknown>) => Do4CE<M, Q | Q1, S, U & R, L | E>;
  doL: <Q1, E, R>(f: (s: S) => Kind4<M, Q1, R, E, unknown>) => Do4CE<M, Q | Q1, S, U & R, L | E>;
  bind: <N extends string, Q1, E, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind4<M, Q1, R, E, A>
  ) => Do4CE<M, Q | Q1, S & { [K in N]: A }, U & R, L | E>;
  bindL: <N extends string, Q1, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind4<M, Q1, R, E, A>
  ) => Do4CE<M, Q | Q1, S & { [K in N]: A }, U & R, L | E>;
  let: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U & R, L | E>;
  letL: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U & R, L | E>;
  sequenceS: <R extends Record<string, GenEffect<any, any, any, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE<
    M,
    SOf<R>,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >;
  sequenceSL: <R extends Record<string, GenEffect<any, any, any, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE<
    M,
    SOf<R>,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >;
  return: <A>(f: (s: S) => A) => RT<Q, U, L, A>;
  done: () => RT<Q, U, L, S>;
}

export interface Do4CE_<M extends EffURI, Q, S extends object, U, L> {
  do: <Q1, R>(ma: Kind4<M, Q1, R, L, unknown>) => Do4CE_<M, Q | Q1, S, U & R, L>;
  doL: <Q1, R>(f: (s: S) => Kind4<M, Q1, R, L, unknown>) => Do4CE_<M, Q | Q1, S, U & R, L>;
  bind: <N extends string, Q1, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind4<M, Q1, R, L, A>
  ) => Do4CE_<M, Q | Q1, S & { [K in N]: A }, U & R, L>;
  bindL: <N extends string, Q1, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind4<M, Q1, R, L, A>
  ) => Do4CE_<M, Q | Q1, S & { [K in N]: A }, U & R, L>;
  let: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U & R, L | E>;
  letL: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U & R, L | E>;
  sequenceS: <R extends Record<string, GenEffect<any, any, L, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE_<M, SOf<R>, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L>;
  sequenceSL: <R extends Record<string, GenEffect<any, any, L, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE_<M, SOf<R>, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L>;
  return: <A>(f: (s: S) => A) => RT<Q, U, L, A>;
  done: () => RT<Q, U, L, S>;
}

declare module "fp-ts-contrib/lib/Do" {
  export function Do<M extends EffURI>(M: Monad4E<M>): Do4CE<M, never, {}, NoEnv, NoErr>;
  export function Do<M extends EffURI, E>(M: Monad4EC<M, E>): Do4CE_<M, never, {}, NoEnv, E>;
}

declare module "fp-ts/lib/Apply" {
  export function sequenceS<F extends EffURI>(
    F: Apply4E<F>
  ): <NER extends Record<string, GenEffect<any, any, any, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, GenEffect<any, any, any, any>>
  ) => RT<
    SOf<NER>,
    EnvOf<NER>,
    {
      [K in keyof NER]: [NER[K]] extends [GenEffect<any, any, infer E, any>] ? E : never;
    }[keyof NER],
    {
      [K in keyof NER]: [NER[K]] extends [GenEffect<any, any, any, infer A>] ? A : never;
    }
  >;

  export function sequenceT<F extends EffURI>(
    F: Apply4E<F>
  ): <T extends Array<GenEffect<any, any, any, any>>>(
    ...t: T & {
      0: GenEffect<any, any, any, any>;
    }
  ) => RT<
    {
      [K in keyof T]: [T[K]] extends [GenEffect<infer S, any, any, any>] ? S : never;
    }[number],
    UnionToIntersection<
      {
        [K in keyof T]: [T[K]] extends [GenEffect<any, infer R, any, any>]
          ? unknown extends R
            ? never
            : R
          : never;
      }[number]
    >,
    {
      [K in keyof T]: [T[K]] extends [GenEffect<any, any, infer E, any>] ? E : never;
    }[number],
    {
      [K in keyof T]: [T[K]] extends [GenEffect<any, any, any, infer A>] ? A : never;
    }
  >;
}

export interface PipeableChain4E<F extends EffURI> extends PipeableApply4E<F> {
  readonly chain: <S1, R, E, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2, E2>(ma: Kind4<F, S2, R2, E2, A>) => RT<S1 | S2, R & R2, E | E2, B>;
  readonly chainFirst: <S1, R, E, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2, E2>(ma: Kind4<F, S2, R2, E2, A>) => RT<S1 | S2, R & R2, E | E2, A>;
  readonly flatten: <S1, S2, R, E, R2, E2, A>(
    mma: Kind4<F, S1, R, E, Kind4<F, S2, R2, E2, A>>
  ) => RT<S1 | S2, R & R2, E | E2, A>;
}

export interface PipeableChain4EC<F extends EffURI, E> extends PipeableApply4EC<F, E> {
  readonly chain: <S1, R, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2>(ma: Kind4<F, S2, R2, E, A>) => RT<S1 | S2, R & R2, E, B>;
  readonly chainFirst: <S1, R, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2>(ma: Kind4<F, S2, R2, E, A>) => RT<S1 | S2, R & R2, E, A>;
  readonly flatten: <S1, S2, R, R2, A>(
    mma: Kind4<F, S1, R, E, Kind4<F, S2, R2, E, A>>
  ) => RT<S1 | S2, R & R2, E, A>;
}

export interface PipeableApply4E<F extends EffURI> extends PipeableFunctor4<F> {
  readonly ap: <S1, R, E, A, E2>(
    fa: Kind4<F, S1, R, E, A>
  ) => <S2, R2, B>(fab: Kind4<F, S2, R2, E2, (a: A) => B>) => RT<S1 | S2, R & R2, E | E2, B>;
  readonly apFirst: <S1, R, E, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2, E2>(fa: Kind4<F, S2, R2, E2, A>) => RT<S1 | S2, R & R2, E | E2, A>;
  readonly apSecond: <S1, R, E, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2, E2>(fa: Kind4<F, S2, R2, E2, A>) => RT<S1 | S2, R & R2, E | E2, B>;
}

export interface PipeableApply4EC<F extends EffURI, E> extends PipeableFunctor4EC<F, E> {
  readonly ap: <S1, R, A>(
    fa: Kind4<F, S1, R, E, A>
  ) => <S2, B, R2>(fab: Kind4<F, S2, R2, E, (a: A) => B>) => RT<S1 | S2, R & R2, E, B>;
  readonly apFirst: <S1, R, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2>(fa: Kind4<F, S2, R2, E, A>) => RT<S1 | S2, R & R2, E, A>;
  readonly apSecond: <S1, R, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2>(fa: Kind4<F, S2, R2, E, A>) => RT<S1 | S2, R & R2, E, B>;
}

export interface PipeableFunctor4EC<F extends EffURI, E> {
  readonly map: <A, B>(f: (a: A) => B) => <S, R>(fa: Kind4<F, S, R, E, A>) => RT<S, R, E, B>;
}

export interface PipeableAlt4E<F extends EffURI> {
  readonly alt: <S1, R, E, A>(
    that: () => Kind4<F, S1, R, E, A>
  ) => <S2, R2, E2>(fa: Kind4<F, S1 | S2, R2, E2, A>) => RT<S1 | S2, R & R2, E, A>;
}

declare module "fp-ts/lib/pipeable" {
  export function pipeable<F extends EffURI, I>(
    I: {
      URI: F;
    } & I
  ): (I extends Chain4E<F>
    ? PipeableChain4E<F>
    : I extends Apply4E<F>
    ? PipeableApply4E<F>
    : I extends Functor4<F>
    ? PipeableFunctor4<F>
    : {}) &
    (I extends Contravariant4<F> ? PipeableContravariant4<F> : {}) &
    (I extends FunctorWithIndex4<F, infer Ix> ? PipeableFunctorWithIndex4<F, Ix> : {}) &
    (I extends Bifunctor4<F> ? PipeableBifunctor4<F> : {}) &
    (I extends Extend4<F> ? PipeableExtend4<F> : {}) &
    (I extends FoldableWithIndex4<F, infer Ix>
      ? PipeableFoldableWithIndex4<F, Ix>
      : I extends Foldable4<F>
      ? PipeableFoldable4<F>
      : {}) &
    (I extends Alt4E<F> ? PipeableAlt4E<F> : {}) &
    (I extends FilterableWithIndex4<F, infer Ix>
      ? PipeableFilterableWithIndex4<F, Ix>
      : I extends Filterable4<F>
      ? PipeableFilterable4<F>
      : I extends Compactable4<F>
      ? PipeableCompactable4<F>
      : {}) &
    (I extends Profunctor4<F> ? PipeableProfunctor4<F> : {}) &
    (I extends Semigroupoid4<F> ? PipeableSemigroupoid4<F> : {}) &
    (I extends MonadThrow4E<F> ? PipeableMonadThrow4<F> : {});
  export function pipeable<F extends EffURI, I, E>(
    I: {
      URI: F;
    } & I
  ): (I extends Chain4EC<F, E>
    ? PipeableChain4EC<F, E>
    : I extends Apply4EC<F, E>
    ? PipeableApply4EC<F, E>
    : I extends Functor4EC<F, E>
    ? PipeableFunctor4EC<F, E>
    : {}) &
    (I extends Alt4EC<F, E> ? PipeableAlt4EC<F, E> : {}) &
    (I extends MonadThrow4EC<F, E> ? PipeableMonadThrow4<F> : {});
}

export interface MonadThrow4E<M extends EffURI> extends Monad4E<M> {
  readonly throwError: <E>(e: E) => RT<never, unknown, E, never>;
}

export interface MonadThrow4EC<M extends EffURI, E> extends Monad4EC<M, E> {
  readonly throwError: (e: E) => RT<never, unknown, E, never>;
}

export interface Alt4EC<F extends EffURI, E> extends Functor4EC<F, E> {
  readonly alt: <S1, S2, R, R2, A>(
    fx: Kind4<F, S1, R, E, A>,
    fy: () => Kind4<F, S2, R2, E, A>
  ) => RT<S1 | S2, R & R2, E, A>;
}

export interface PipeableAlt4EC<F extends EffURI, E> {
  readonly alt: <S1, R, A>(
    that: () => Kind4<F, S1, R, E, A>
  ) => <S2, R2>(fa: Kind4<F, S2, R2, E, A>) => RT<S1 | S2, R & R2, E, A>;
}

export interface PipeableMonadThrow4EC<F extends EffURI, E> {
  readonly fromOption: (onNone: () => E) => <A>(ma: Option<A>) => RT<never, NoEnv, E, A>;
  readonly fromEither: <A>(ma: Either<E, A>) => RT<never, NoEnv, E, A>;
  readonly fromPredicate: {
    <A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
      a: A
    ) => RT<never, NoEnv, E, B>;
    <A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => RT<never, NoEnv, E, A>;
  };
  readonly filterOrElse: {
    <A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <S, R>(
      ma: Kind4<F, S, R, E, A>
    ) => RT<S, R, E, B>;
    <A>(predicate: Predicate<A>, onFalse: (a: A) => E): <S, R>(
      ma: Kind4<F, S, R, E, A>
    ) => RT<S, R, E, A>;
  };
}
