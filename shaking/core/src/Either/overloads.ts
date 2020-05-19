import type { Alt2 } from "fp-ts/lib/Alt"
import type { Bifunctor2 } from "fp-ts/lib/Bifunctor"
import type { Compactable2 } from "fp-ts/lib/Compactable"
import type { Contravariant2 } from "fp-ts/lib/Contravariant"
import type { Either } from "fp-ts/lib/Either"
import type { Extend2 } from "fp-ts/lib/Extend"
import type { Filterable2 } from "fp-ts/lib/Filterable"
import type { FilterableWithIndex2 } from "fp-ts/lib/FilterableWithIndex"
import type { Foldable2 } from "fp-ts/lib/Foldable"
import type { FoldableWithIndex2 } from "fp-ts/lib/FoldableWithIndex"
import type { Functor2 } from "fp-ts/lib/Functor"
import type { FunctorWithIndex2 } from "fp-ts/lib/FunctorWithIndex"
import type { Kind2 } from "fp-ts/lib/HKT"
import type { Profunctor2 } from "fp-ts/lib/Profunctor"
import type { Semigroupoid2 } from "fp-ts/lib/Semigroupoid"
import type { PipeableFunctor2 } from "fp-ts/lib/pipeable"

import type { URI } from "./index"

export interface ChainRec2M<F extends URI> extends Chain2M<F> {
  readonly chainRec: <E, A, B>(
    a: A,
    f: (a: A) => Kind2<F, E, Either<A, B>>
  ) => Kind2<F, E, B>
}
export interface Chain2M<F extends URI> extends Apply2M<F> {
  readonly chain: <E, A, B, E2>(
    fa: Kind2<F, E, A>,
    f: (a: A) => Kind2<F, E2, B>
  ) => Kind2<F, E | E2, B>
}
export interface MonadThrow2M<M extends URI> extends Monad2M<M> {
  readonly throwError: <E, A>(e: E) => Kind2<M, E, A>
}
declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export interface Apply2M<F extends URI> extends Functor2<F> {
  readonly ap: <E, A, B, E2>(
    fab: Kind2<F, E, (a: A) => B>,
    fa: Kind2<F, E2, A>
  ) => Kind2<F, E | E2, B>
}

declare module "fp-ts/lib/Apply" {
  export function sequenceT<F extends URI>(
    F: Apply2M<F>
  ): <Z extends Array<Kind2<F, any, any>>>(
    ...t: Z & {
      readonly 0: Kind2<F, any, any>
    }
  ) => Kind2<
    F,
    {
      [K in keyof Z]: Z[K] extends Kind2<F, infer _E, infer _A> ? _E : never
    }[number],
    {
      [K in keyof Z]: Z[K] extends Kind2<F, infer _E, infer _A> ? _A : never
    }[number]
  >
  export function sequenceS<F extends URI>(
    F: Apply2M<F>
  ): <NER extends Record<string, Kind2<F, any, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Kind2<F, any, any>>
  ) => Kind2<
    F,
    {
      [K in keyof NER]: [NER[K]] extends [Kind2<F, infer _E, infer _A>] ? _E : never
    }[keyof NER],
    {
      [K in keyof NER]: [NER[K]] extends [Kind2<F, infer _E, infer _A>] ? _A : never
    }
  >
}
export interface Applicative2M<F extends URI> extends Apply2M<F> {
  readonly of: <E, A>(a: A) => Kind2<F, E, A>
}
export interface Monad2M<M extends URI> extends Applicative2M<M>, Chain2M<M> {
  _K: "Monad2M"
}

export interface PipeableApply2M<F extends URI> extends PipeableFunctor2<F> {
  readonly ap: <E, A>(
    fa: Kind2<F, E, A>
  ) => <E2, B>(fab: Kind2<F, E2, (a: A) => B>) => Kind2<F, E | E2, B>
  readonly apFirst: <E, B>(
    fb: Kind2<F, E, B>
  ) => <E2, A>(fa: Kind2<F, E2, A>) => Kind2<F, E | E2, A>
  readonly apSecond: <E, B>(
    fb: Kind2<F, E, B>
  ) => <E2, A>(fa: Kind2<F, E2, A>) => Kind2<F, E | E2, B>
}

export interface PipeableChain2M<F extends URI> extends PipeableApply2M<F> {
  readonly chain: <E, A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => <E2>(ma: Kind2<F, E2, A>) => Kind2<F, E | E2, B>
  readonly chainFirst: <E, A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => <E2>(ma: Kind2<F, E2, A>) => Kind2<F, E | E2, A>
  readonly flatten: <E, E2, A>(mma: Kind2<F, E, Kind2<F, E2, A>>) => Kind2<F, E | E2, A>
}

declare module "fp-ts/lib/pipeable" {
  export function pipeable<F extends URI, I>(
    I: {
      readonly URI: F
    } & I
  ): (I extends Chain2M<F>
    ? PipeableChain2M<F>
    : I extends Apply2M<F>
    ? PipeableApply2M<F>
    : I extends Functor2<F>
    ? PipeableFunctor2<F>
    : {}) &
    (I extends Contravariant2<F> ? PipeableContravariant2<F> : {}) &
    (I extends FunctorWithIndex2<F, infer Ix> ? PipeableFunctorWithIndex2<F, Ix> : {}) &
    (I extends Bifunctor2<F> ? PipeableBifunctor2<F> : {}) &
    (I extends Extend2<F> ? PipeableExtend2<F> : {}) &
    (I extends FoldableWithIndex2<F, infer Ix>
      ? PipeableFoldableWithIndex2<F, Ix>
      : I extends Foldable2<F>
      ? PipeableFoldable2<F>
      : {}) &
    (I extends Alt2<F> ? PipeableAlt2<F> : {}) &
    (I extends FilterableWithIndex2<F, infer Ix>
      ? PipeableFilterableWithIndex2<F, Ix>
      : I extends Filterable2<F>
      ? PipeableFilterable2<F>
      : I extends Compactable2<F>
      ? PipeableCompactable2<F>
      : {}) &
    (I extends Profunctor2<F> ? PipeableProfunctor2<F> : {}) &
    (I extends Semigroupoid2<F> ? PipeableSemigroupoid2<F> : {}) &
    (I extends MonadThrow2M<F> ? PipeableMonadThrow2<F> : {})
}

declare module "fp-ts-contrib/lib/Do" {
  export function Do<M extends URI>(M: Monad2M<M>): Do2MC<M, {}, never>

  export interface Do2MC<M extends URI, S extends object, E> {
    do: <E2>(ma: Kind2<M, E2, any>) => Do2MC<M, S, E | E2>
    doL: <E2>(f: (s: S) => Kind2<M, E2, any>) => Do2MC<M, S, E | E2>
    bind: <N extends string, A, E2>(
      name: Exclude<N, keyof S>,
      ma: Kind2<M, E2, A>
    ) => Do2MC<
      M,
      S &
        {
          [K in N]: A
        },
      E | E2
    >
    bindL: <N extends string, A, E2>(
      name: Exclude<N, keyof S>,
      f: (s: S) => Kind2<M, E2, A>
    ) => Do2MC<
      M,
      S &
        {
          [K in N]: A
        },
      E | E2
    >
    let: <N extends string, A>(
      name: Exclude<N, keyof S>,
      a: A
    ) => Do2MC<
      M,
      S &
        {
          [K in N]: A
        },
      E
    >
    letL: <N extends string, A>(
      name: Exclude<N, keyof S>,
      f: (s: S) => A
    ) => Do2MC<
      M,
      S &
        {
          [K in N]: A
        },
      E
    >
    sequenceS: <I extends Record<string, Kind2<M, any, any>>>(
      r: EnforceNonEmptyRecord<I> &
        {
          [K in keyof S]?: never
        }
    ) => Do2MC<
      M,
      S &
        {
          [K in keyof I]: [I[K]] extends [Kind2<M, any, infer A>] ? A : never
        },
      | E
      | {
          [K in keyof I]: [I[K]] extends [Kind2<M, infer E2, any>] ? E2 : never
        }[keyof I]
    >
    sequenceSL: <I extends Record<string, Kind2<M, any, any>>>(
      f: (
        s: S
      ) => EnforceNonEmptyRecord<I> &
        {
          [K in keyof S]?: never
        }
    ) => Do2MC<
      M,
      S &
        {
          [K in keyof I]: [I[K]] extends [Kind2<M, any, infer A>] ? A : never
        },
      | E
      | {
          [K in keyof I]: [I[K]] extends [Kind2<M, infer E2, any>] ? E2 : never
        }[keyof I]
    >
    return: <A>(f: (s: S) => A) => Kind2<M, E, A>
    done: () => Kind2<M, E, S>
  }
}
