import "fp-ts-contrib/lib/Do";

import { Kind3, URIS3 } from "fp-ts/lib/HKT";
import { Applicative3 } from "fp-ts/lib/Applicative";
import { Functor3 } from "fp-ts/lib/Functor";
import { Contravariant3 } from "fp-ts/lib/Contravariant";
import { FunctorWithIndex3 } from "fp-ts/lib/FunctorWithIndex";
import { Bifunctor3 } from "fp-ts/lib/Bifunctor";
import { Extend3 } from "fp-ts/lib/Extend";
import { FoldableWithIndex3 } from "fp-ts/lib/FoldableWithIndex";
import { Foldable3 } from "fp-ts/lib/Foldable";
import { Alt3 } from "fp-ts/lib/Alt";
import { FilterableWithIndex3 } from "fp-ts/lib/FilterableWithIndex";
import { Filterable3 } from "fp-ts/lib/Filterable";
import { Compactable3 } from "fp-ts/lib/Compactable";
import { Profunctor3 } from "fp-ts/lib/Profunctor";
import { Semigroupoid3 } from "fp-ts/lib/Semigroupoid";
import {
  PipeableAlt3,
  PipeableBifunctor3,
  PipeableCompactable3,
  PipeableContravariant3,
  PipeableExtend3,
  PipeableFilterable3,
  PipeableFilterableWithIndex3,
  PipeableFoldable3,
  PipeableFoldableWithIndex3,
  PipeableFunctor3,
  PipeableFunctorWithIndex3,
  PipeableMonadThrow3,
  PipeableProfunctor3,
  PipeableSemigroupoid3
} from "fp-ts/lib/pipeable";
import { Apply3 } from "fp-ts/lib/Apply";
import { NoEnv, NoErr } from "./index";

export interface Chain3E<F extends URIS3> extends Apply3<F> {
  readonly chain: <R, E, A, R2, E2, B>(
    fa: Kind3<F, R, E, A>,
    f: (a: A) => Kind3<F, R2, E2, B>
  ) => Kind3<F, R & R2, E | E2, B>;
}

export interface Monad3E<M extends URIS3> extends Applicative3<M>, Chain3E<M> {}

export interface Monad3EC<M extends URIS3, E>
  extends Applicative3EC<M, E>,
    Chain3EC<M, E> {}

export interface Applicative3EC<F extends URIS3, E> extends Apply3EC<F, E> {
  readonly of: <R, A>(a: A) => Kind3<F, R, E, A>;
}

export interface Apply3EC<F extends URIS3, E> extends Functor3EC<F, E> {
  readonly ap: <R, R2, A, B>(
    fab: Kind3<F, R, E, (a: A) => B>,
    fa: Kind3<F, R2, E, A>
  ) => Kind3<F, R & R2, E, B>;
}

export interface Chain3EC<F extends URIS3, E> extends Apply3EC<F, E> {
  readonly chain: <R, A, R2, B>(
    fa: Kind3<F, R, E, A>,
    f: (a: A) => Kind3<F, R2, E, B>
  ) => Kind3<F, R & R2, E, B>;
}

export interface Functor3EC<F extends URIS3, E> {
  readonly URI: F;
  readonly _E: E;
  readonly map: <R, A, B>(
    fa: Kind3<F, R, E, A>,
    f: (a: A) => B
  ) => Kind3<F, R, E, B>;
}

declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

export interface Do3CE<M extends URIS3, S extends object, U, L> {
  do: <E, R>(ma: Kind3<M, R, E, unknown>) => Do3CE<M, S, U & R, L | E>;
  doL: <E, R>(
    f: (s: S) => Kind3<M, R, E, unknown>
  ) => Do3CE<M, S, U & R, L | E>;
  bind: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind3<M, R, E, A>
  ) => Do3CE<
    M,
    S &
      {
        [K in N]: A;
      },
    U & R,
    L | E
  >;
  bindL: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind3<M, R, E, A>
  ) => Do3CE<
    M,
    S &
      {
        [K in N]: A;
      },
    U & R,
    L | E
  >;
  sequenceS: <R extends Record<string, Kind3<M, U, L, any>>>(
    r: EnforceNonEmptyRecord<R> &
      {
        [K in keyof S]?: never;
      }
  ) => Do3CE<
    M,
    S &
      {
        [K in keyof R]: [R[K]] extends [Kind3<M, any, any, infer A>]
          ? A
          : never;
      },
    U,
    L
  >;
  sequenceSL: <R extends Record<string, Kind3<M, U, L, any>>>(
    f: (
      s: S
    ) => EnforceNonEmptyRecord<R> &
      {
        [K in keyof S]?: never;
      }
  ) => Do3CE<
    M,
    S &
      {
        [K in keyof R]: [R[K]] extends [Kind3<M, any, any, infer A>]
          ? A
          : never;
      },
    U,
    L
  >;
  return: <A>(f: (s: S) => A) => Kind3<M, U, L, A>;
  done: () => Kind3<M, U, L, S>;
}

declare module "fp-ts-contrib/lib/Do" {
  export function Do<M extends URIS3>(
    M: Monad3E<M>
  ): Do3CE<M, {}, NoEnv, NoErr>;
}

export interface PipeableChain3E<F extends URIS3> extends PipeableApply3E<F> {
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

export interface PipeableApply3E<F extends URIS3> extends PipeableFunctor3<F> {
  readonly ap: <R, E, A, R2, E2>(
    fa: Kind3<F, R, E, A>
  ) => <B>(fab: Kind3<F, R2, E2, (a: A) => B>) => Kind3<F, R & R2, E | E2, B>;
  readonly apFirst: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, A>;
  readonly apSecond: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, B>;
}

export interface Apply3E<F extends URIS3> extends Functor3<F> {
  readonly ap: <R, E, A, B, R2, E2>(
    fab: Kind3<F, R, E, (a: A) => B>,
    fa: Kind3<F, R2, E2, A>
  ) => Kind3<F, R & R2, E | E2, B>;
}

declare module "fp-ts/lib/pipeable" {
  export function pipeable<F extends URIS3, I>(
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
    (I extends Alt3<F> ? PipeableAlt3<F> : {}) &
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
}

export interface MonadThrow3E<M extends URIS3> extends Monad3E<M> {
  readonly throwError: <R, E, A>(e: E) => Kind3<M, R, E, A>;
}

export interface MonadThrow3EC<M extends URIS3, E> extends Monad3EC<M, E> {
  readonly throwError: <R, A>(e: E) => Kind3<M, R, E, A>;
}

export interface Alt3EC<F extends URIS3, E> extends Functor3EC<F, E> {
  readonly alt: <R, R2, A>(
    fx: Kind3<F, R, E, A>,
    fy: () => Kind3<F, R2, E, A>
  ) => Kind3<F, R & R2, E, A>;
}
