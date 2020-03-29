import {} from "fp-ts-contrib/lib/Do";
import { Kind3 } from "fp-ts/lib/HKT";
import { Functor3 } from "fp-ts/lib/Functor";
import { Contravariant3 } from "fp-ts/lib/Contravariant";
import { FunctorWithIndex3 } from "fp-ts/lib/FunctorWithIndex";
import { Bifunctor3 } from "fp-ts/lib/Bifunctor";
import { Extend3 } from "fp-ts/lib/Extend";
import { FoldableWithIndex3 } from "fp-ts/lib/FoldableWithIndex";
import { Foldable3 } from "fp-ts/lib/Foldable";
import { FilterableWithIndex3 } from "fp-ts/lib/FilterableWithIndex";
import { Filterable3 } from "fp-ts/lib/Filterable";
import { Compactable3 } from "fp-ts/lib/Compactable";
import { Profunctor3 } from "fp-ts/lib/Profunctor";
import { Semigroupoid3 } from "fp-ts/lib/Semigroupoid";
import { PipeableFunctor3 } from "fp-ts/lib/pipeable";
import { NoEnv, NoErr } from "./effect";
import { Either } from "fp-ts/lib/Either";
import { Option } from "fp-ts/lib/Option";
import { Refinement, Predicate } from "fp-ts/lib/function";
import { MatechsURIS } from "./uri";

export interface Chain3E<F extends MatechsURIS> extends Apply3E<F> {
  readonly chain: <R, E, A, R2, E2, B>(
    fa: Kind3<F, R, E, A>,
    f: (a: A) => Kind3<F, R2, E2, B>
  ) => Kind3<F, R & R2, E | E2, B>;
}

export interface Applicative3E<F extends MatechsURIS> extends Apply3E<F> {
  readonly of: <R, E, A>(a: A) => Kind3<F, R, E, A>;
}

export interface Alt3E<F extends MatechsURIS> extends Functor3<F> {
  readonly alt: <R, R2, E, E2, A>(
    fx: Kind3<F, R, E, A>,
    fy: () => Kind3<F, R2, E2, A>
  ) => Kind3<F, R & R2, E2, A>;
}

export interface Monad3E<M extends MatechsURIS>
  extends Applicative3E<M>,
    Chain3E<M> {}

export interface Monad3EC<M extends MatechsURIS, E>
  extends Applicative3EC<M, E>,
    Chain3EC<M, E> {}

export interface Applicative3EC<F extends MatechsURIS, E>
  extends Apply3EC<F, E> {
  readonly of: <R, A>(a: A) => Kind3<F, R, E, A>;
}

export interface Apply3EC<F extends MatechsURIS, E> extends Functor3EC<F, E> {
  readonly ap: <R, R2, A, B>(
    fab: Kind3<F, R, E, (a: A) => B>,
    fa: Kind3<F, R2, E, A>
  ) => Kind3<F, R & R2, E, B>;
}

export interface Chain3EC<F extends MatechsURIS, E> extends Apply3EC<F, E> {
  readonly chain: <R, A, R2, B>(
    fa: Kind3<F, R, E, A>,
    f: (a: A) => Kind3<F, R2, E, B>
  ) => Kind3<F, R & R2, E, B>;
}

export interface Functor3EC<F extends MatechsURIS, E> {
  readonly URI: F;
  readonly _E: E;
  readonly map: <R, A, B>(
    fa: Kind3<F, R, E, A>,
    f: (a: A) => B
  ) => Kind3<F, R, E, B>;
}

declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

interface GenEffect<R, E, A> {
  _TAG: "Effect" | "Managed" | "Stream" | "StreamEither";
  _E: E;
  _A: A;
  _R: (_: R) => void;
}

export type ATypeOf<X> = X extends GenEffect<infer R, infer E, infer A>
  ? A
  : never;

export type ETypeOf<X> = X extends GenEffect<infer R, infer E, infer A>
  ? E
  : never;

export type RTypeOf<X> = X extends GenEffect<infer R, infer E, infer A>
  ? R
  : never;

export type EnvOf<
  R extends Record<string, Kind3<any, any, any, any>>
> = UnionToIntersection<
  {
    [K in keyof R]: unknown extends RTypeOf<R[K]> ? never : RTypeOf<R[K]>;
  }[keyof R]
>;

export interface Do3CE<M extends MatechsURIS, S extends object, U, L> {
  do: <E, R>(ma: Kind3<M, R, E, unknown>) => Do3CE<M, S, U & R, L | E>;
  doL: <E, R>(
    f: (s: S) => Kind3<M, R, E, unknown>
  ) => Do3CE<M, S, U & R, L | E>;
  bind: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind3<M, R, E, A>
  ) => Do3CE<M, S & { [K in N]: A }, U & R, L | E>;
  bindL: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind3<M, R, E, A>
  ) => Do3CE<M, S & { [K in N]: A }, U & R, L | E>;
  sequenceS: <R extends Record<string, Kind3<M, never, any, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do3CE<
    M,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >;
  sequenceSL: <R extends Record<string, Kind3<M, never, any, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do3CE<
    M,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >;
  return: <A>(f: (s: S) => A) => Kind3<M, U, L, A>;
  done: () => Kind3<M, U, L, S>;
}

export interface Do3CE_<M extends MatechsURIS, S extends object, U, L> {
  do: <R>(ma: Kind3<M, R, L, unknown>) => Do3CE_<M, S, U & R, L>;
  doL: <R>(f: (s: S) => Kind3<M, R, L, unknown>) => Do3CE_<M, S, U & R, L>;
  bind: <N extends string, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind3<M, R, L, A>
  ) => Do3CE_<M, S & { [K in N]: A }, U & R, L>;
  bindL: <N extends string, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind3<M, R, L, A>
  ) => Do3CE_<M, S & { [K in N]: A }, U & R, L>;
  sequenceS: <R extends Record<string, Kind3<M, never, L, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do3CE_<M, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L>;
  sequenceSL: <R extends Record<string, Kind3<M, never, L, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do3CE_<M, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L>;
  return: <A>(f: (s: S) => A) => Kind3<M, U, L, A>;
  done: () => Kind3<M, U, L, S>;
}

declare module "fp-ts-contrib/lib/Do" {
  export function Do<M extends MatechsURIS>(
    M: Monad3E<M>
  ): Do3CE<M, {}, NoEnv, NoErr>;
  export function Do<M extends MatechsURIS, E>(
    M: Monad3EC<M, E>
  ): Do3CE_<M, {}, NoEnv, E>;
}

declare module "fp-ts/lib/Apply" {
  type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

  export function sequenceS<F extends MatechsURIS>(
    F: Apply3E<F>
  ): <NER extends Record<string, Kind3<F, any, any, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Kind3<F, any, any, any>>
  ) => Kind3<
    F,
    EnvOf<NER>,
    {
      [K in keyof NER]: [NER[K]] extends [Kind3<F, any, infer E, any>]
        ? E
        : never;
    }[keyof NER],
    {
      [K in keyof NER]: [NER[K]] extends [Kind3<F, any, any, infer A>]
        ? A
        : never;
    }
  >;

  export function sequenceT<F extends MatechsURIS>(
    F: Apply3E<F>
  ): <T extends Array<Kind3<F, any, any, any>>>(
    ...t: T & {
      0: Kind3<F, any, any, any>;
    }
  ) => Kind3<
    F,
    UnionToIntersection<
      {
        [K in keyof T]: [T[K]] extends [Kind3<F, infer R, any, any>]
          ? unknown extends R
            ? never
            : R
          : never;
      }[number]
    >,
    {
      [K in keyof T]: [T[K]] extends [Kind3<F, any, infer E, any>] ? E : never;
    }[number],
    {
      [K in keyof T]: [T[K]] extends [Kind3<F, any, any, infer A>] ? A : never;
    }
  >;
}

export interface PipeableChain3E<F extends MatechsURIS>
  extends PipeableApply3E<F> {
  readonly chain: <R, E, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <R2, E2>(ma: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, B>;
  readonly chainFirst: <R, E, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <R2, E2>(ma: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, A>;
  readonly flatten: <R, E, R2, E2, A>(
    mma: Kind3<F, R, E, Kind3<F, R2, E2, A>>
  ) => Kind3<F, R & R2, E | E2, A>;
}

export interface PipeableChain3EC<F extends MatechsURIS, E>
  extends PipeableApply3EC<F, E> {
  readonly chain: <R, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <R2>(ma: Kind3<F, R2, E, A>) => Kind3<F, R & R2, E, B>;
  readonly chainFirst: <R, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <R2>(ma: Kind3<F, R2, E, A>) => Kind3<F, R & R2, E, A>;
  readonly flatten: <R, R2, A>(
    mma: Kind3<F, R, E, Kind3<F, R2, E, A>>
  ) => Kind3<F, R & R2, E, A>;
}

export interface PipeableApply3E<F extends MatechsURIS>
  extends PipeableFunctor3<F> {
  readonly ap: <R, E, A, E2>(
    fa: Kind3<F, R, E, A>
  ) => <R2, B>(
    fab: Kind3<F, R2, E2, (a: A) => B>
  ) => Kind3<F, R & R2, E | E2, B>;
  readonly apFirst: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, A>;
  readonly apSecond: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, B>;
}

export interface PipeableApply3EC<F extends MatechsURIS, E>
  extends PipeableFunctor3EC<F, E> {
  readonly ap: <R, A>(
    fa: Kind3<F, R, E, A>
  ) => <B, R2>(fab: Kind3<F, R2, E, (a: A) => B>) => Kind3<F, R & R2, E, B>;
  readonly apFirst: <R, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2>(fa: Kind3<F, R2, E, A>) => Kind3<F, R & R2, E, A>;
  readonly apSecond: <R, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2>(fa: Kind3<F, R2, E, A>) => Kind3<F, R & R2, E, B>;
}

export interface PipeableFunctor3EC<F extends MatechsURIS, E> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <R>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>;
}

export interface Apply3E<F extends MatechsURIS> extends Functor3<F> {
  readonly ap: <R, E, A, B, R2, E2>(
    fab: Kind3<F, R, E, (a: A) => B>,
    fa: Kind3<F, R2, E2, A>
  ) => Kind3<F, R & R2, E | E2, B>;
}

export interface PipeableAlt3E<F extends MatechsURIS> {
  readonly alt: <R, E, A>(
    that: () => Kind3<F, R, E, A>
  ) => <R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E, A>;
}

declare module "fp-ts/lib/pipeable" {
  export function pipeable<F extends MatechsURIS, I>(
    I: {
      URI: F;
    } & I
  ): (I extends Chain3E<F>
    ? PipeableChain3E<F>
    : I extends Apply3E<F>
    ? PipeableApply3E<F>
    : I extends Functor3<F>
    ? PipeableFunctor3<F>
    : {}) &
    (I extends Contravariant3<F> ? PipeableContravariant3<F> : {}) &
    (I extends FunctorWithIndex3<F, infer Ix>
      ? PipeableFunctorWithIndex3<F, Ix>
      : {}) &
    (I extends Bifunctor3<F> ? PipeableBifunctor3<F> : {}) &
    (I extends Extend3<F> ? PipeableExtend3<F> : {}) &
    (I extends FoldableWithIndex3<F, infer Ix>
      ? PipeableFoldableWithIndex3<F, Ix>
      : I extends Foldable3<F>
      ? PipeableFoldable3<F>
      : {}) &
    (I extends Alt3E<F> ? PipeableAlt3E<F> : {}) &
    (I extends FilterableWithIndex3<F, infer Ix>
      ? PipeableFilterableWithIndex3<F, Ix>
      : I extends Filterable3<F>
      ? PipeableFilterable3<F>
      : I extends Compactable3<F>
      ? PipeableCompactable3<F>
      : {}) &
    (I extends Profunctor3<F> ? PipeableProfunctor3<F> : {}) &
    (I extends Semigroupoid3<F> ? PipeableSemigroupoid3<F> : {}) &
    (I extends MonadThrow3E<F> ? PipeableMonadThrow3<F> : {});
  export function pipeable<F extends MatechsURIS, I, E>(
    I: {
      URI: F;
    } & I
  ): (I extends Chain3EC<F, E>
    ? PipeableChain3EC<F, E>
    : I extends Apply3EC<F, E>
    ? PipeableApply3EC<F, E>
    : I extends Functor3EC<F, E>
    ? PipeableFunctor3EC<F, E>
    : {}) &
    // (I extends Contravariant3<F> ? PipeableContravariant3<F> : {}) &
    // (I extends FunctorWithIndex3<F, infer Ix>
    //   ? PipeableFunctorWithIndex3<F, Ix>
    //   : {}) &
    // (I extends Bifunctor3<F> ? PipeableBifunctor3<F> : {}) &
    // (I extends Extend3<F> ? PipeableExtend3<F> : {}) &
    // (I extends FoldableWithIndex3<F, infer Ix>
    //   ? PipeableFoldableWithIndex3<F, Ix>
    //   : I extends Foldable3<F>
    //   ? PipeableFoldable3<F>
    //   : {}) &
    (I extends Alt3EC<F, E> ? PipeableAlt3EC<F, E> : {}) &
    // (I extends FilterableWithIndex3<F, infer Ix>
    //   ? PipeableFilterableWithIndex3<F, Ix>
    //   : I extends Filterable3<F>
    //   ? PipeableFilterable3<F>
    //   : I extends Compactable3<F>
    //   ? PipeableCompactable3<F>
    //   : {}) &
    // (I extends Profunctor3<F> ? PipeableProfunctor3<F> : {}) &
    // (I extends Semigroupoid3<F> ? PipeableSemigroupoid3<F> : {}) &
    (I extends MonadThrow3EC<F, E> ? PipeableMonadThrow3<F> : {});
}

export interface MonadThrow3E<M extends MatechsURIS> extends Monad3E<M> {
  readonly throwError: <E>(e: E) => Kind3<M, unknown, E, never>;
}

export interface MonadThrow3EC<M extends MatechsURIS, E>
  extends Monad3EC<M, E> {
  readonly throwError: (e: E) => Kind3<M, unknown, E, never>;
}

export interface Alt3EC<F extends MatechsURIS, E> extends Functor3EC<F, E> {
  readonly alt: <R, R2, A>(
    fx: Kind3<F, R, E, A>,
    fy: () => Kind3<F, R2, E, A>
  ) => Kind3<F, R & R2, E, A>;
}

export interface PipeableAlt3EC<F extends MatechsURIS, E> {
  readonly alt: <R, A>(
    that: () => Kind3<F, R, E, A>
  ) => <R2>(fa: Kind3<F, R2, E, A>) => Kind3<F, R & R2, E, A>;
}

export interface PipeableMonadThrow3EC<F extends MatechsURIS, E> {
  readonly fromOption: (
    onNone: () => E
  ) => <R, A>(ma: Option<A>) => Kind3<F, R, E, A>;
  readonly fromEither: <R, A>(ma: Either<E, A>) => Kind3<F, R, E, A>;
  readonly fromPredicate: {
    <A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <U>(
      a: A
    ) => Kind3<F, U, E, B>;
    <A>(predicate: Predicate<A>, onFalse: (a: A) => E): <R>(
      a: A
    ) => Kind3<F, R, E, A>;
  };
  readonly filterOrElse: {
    <A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <R>(
      ma: Kind3<F, R, E, A>
    ) => Kind3<F, R, E, B>;
    <A>(predicate: Predicate<A>, onFalse: (a: A) => E): <R>(
      ma: Kind3<F, R, E, A>
    ) => Kind3<F, R, E, A>;
  };
}
