import {} from "fp-ts-contrib/lib/Do";
import { Kind3, URIS, URIS3, Kind, HKT, URIS2, Kind2 } from "fp-ts/lib/HKT";
import { Functor3 } from "fp-ts/lib/Functor";
import { Contravariant3 } from "fp-ts/lib/Contravariant";
import { FunctorWithIndex3 } from "fp-ts/lib/FunctorWithIndex";
import { Bifunctor3 } from "fp-ts/lib/Bifunctor";
import { Extend3 } from "fp-ts/lib/Extend";
import { FoldableWithIndex3 } from "fp-ts/lib/FoldableWithIndex";
import { Foldable3 } from "fp-ts/lib/Foldable";
import { FilterableWithIndex3 } from "fp-ts/lib/FilterableWithIndex";
import { Filterable3 } from "fp-ts/lib/Filterable";
import { Compactable3, Separated } from "fp-ts/lib/Compactable";
import { Profunctor3 } from "fp-ts/lib/Profunctor";
import { Semigroupoid3 } from "fp-ts/lib/Semigroupoid";
import { PipeableFunctor3 } from "fp-ts/lib/pipeable";
import { NoEnv, NoErr, AsyncContext } from "./effect";
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

export interface Chain3EP<F extends MatechsURIS> extends Apply3EP<F> {
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

export interface Monad3E<M extends MatechsURIS> extends Applicative3E<M>, Chain3E<M> {}
export interface Monad3EP<M extends MatechsURIS> extends Applicative3EP<M>, Chain3EP<M> {}

export interface Monad3EC<M extends MatechsURIS, E> extends Applicative3EC<M, E>, Chain3EC<M, E> {}

export interface Applicative3EC<F extends MatechsURIS, E> extends Apply3EC<F, E> {
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
  readonly map: <R, A, B>(fa: Kind3<F, R, E, A>, f: (a: A) => B) => Kind3<F, R, E, B>;
}

declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

interface GenEffect<R, E, A> {
  _TAG: () => "Effect" | "Managed" | "Stream" | "StreamEither";
  _E: () => E;
  _A: () => A;
  _R: (_: R) => void;
}

export type ATypeOf<X> = X extends GenEffect<infer R, infer E, infer A> ? A : never;

export type ETypeOf<X> = X extends GenEffect<infer R, infer E, infer A> ? E : never;

export type RTypeOf<X> = X extends GenEffect<infer R, infer E, infer A> ? R : never;

export type EnvOf<R extends Record<string, Kind3<any, any, any, any>>> = UnionToIntersection<
  {
    [K in keyof R]: unknown extends RTypeOf<R[K]> ? never : RTypeOf<R[K]>;
  }[keyof R]
>;

export interface Do3CE<M extends MatechsURIS, S extends object, U, L> {
  do: <E, R>(ma: Kind3<M, R, E, unknown>) => Do3CE<M, S, U & R, L | E>;
  doL: <E, R>(f: (s: S) => Kind3<M, R, E, unknown>) => Do3CE<M, S, U & R, L | E>;
  bind: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind3<M, R, E, A>
  ) => Do3CE<M, S & { [K in N]: A }, U & R, L | E>;
  bindL: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind3<M, R, E, A>
  ) => Do3CE<M, S & { [K in N]: A }, U & R, L | E>;
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do3CE<M, S & { [K in N]: A }, U, L>;
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do3CE<M, S & { [K in N]: A }, U, L>;
  sequenceS: <R extends Record<string, Kind3<M, never, any, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do3CE<M, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L | ETypeOf<R[keyof R]>>;
  sequenceSL: <R extends Record<string, Kind3<M, never, any, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do3CE<M, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L | ETypeOf<R[keyof R]>>;
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
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do3CE_<M, S & { [K in N]: A }, U, L>;
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do3CE_<M, S & { [K in N]: A }, U, L>;
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
  export function Do<M extends MatechsURIS>(M: Monad3E<M>): Do3CE<M, {}, NoEnv, NoErr>;
  export function Do<M extends MatechsURIS>(M: Monad3EP<M>): Do3CE<M, AsyncContext, NoEnv, NoErr>;
  export function Do<M extends MatechsURIS, E>(M: Monad3EC<M, E>): Do3CE_<M, {}, NoEnv, E>;
}

declare module "fp-ts/lib/Apply" {
  type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

  export function sequenceS<F extends MatechsURIS>(
    F: Apply3E<F> | Apply3EP<F>
  ): <NER extends Record<string, Kind3<F, any, any, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Kind3<F, any, any, any>>
  ) => Kind3<
    F,
    EnvOf<NER>,
    {
      [K in keyof NER]: [NER[K]] extends [Kind3<F, any, infer E, any>] ? E : never;
    }[keyof NER],
    {
      [K in keyof NER]: [NER[K]] extends [Kind3<F, any, any, infer A>] ? A : never;
    }
  >;

  export function sequenceS<F extends MatechsURIS>(
    F: Apply3EP<F>
  ): <NER extends Record<string, Kind3<F, any, any, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Kind3<F, any, any, any>>
  ) => Kind3<
    F,
    AsyncContext & EnvOf<NER>,
    {
      [K in keyof NER]: [NER[K]] extends [Kind3<F, any, infer E, any>] ? E : never;
    }[keyof NER],
    {
      [K in keyof NER]: [NER[K]] extends [Kind3<F, any, any, infer A>] ? A : never;
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

  export function sequenceT<F extends MatechsURIS>(
    F: Apply3EP<F>
  ): <T extends Array<Kind3<F, any, any, any>>>(
    ...t: T & {
      0: Kind3<F, any, any, any>;
    }
  ) => Kind3<
    F,
    AsyncContext &
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

export interface PipeableChain3E<F extends MatechsURIS> extends PipeableApply3E<F> {
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

export interface PipeableChain3EP<F extends MatechsURIS> extends PipeableApply3EP<F> {
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

export interface PipeableChain3EC<F extends MatechsURIS, E> extends PipeableApply3EC<F, E> {
  readonly chain: <R, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <R2>(ma: Kind3<F, R2, E, A>) => Kind3<F, R & R2, E, B>;
  readonly chainFirst: <R, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <R2>(ma: Kind3<F, R2, E, A>) => Kind3<F, R & R2, E, A>;
  readonly flatten: <R, R2, A>(mma: Kind3<F, R, E, Kind3<F, R2, E, A>>) => Kind3<F, R & R2, E, A>;
}

export interface PipeableApply3E<F extends MatechsURIS> extends PipeableFunctor3<F> {
  readonly ap: <R, E, A, E2>(
    fa: Kind3<F, R, E, A>
  ) => <R2, B>(fab: Kind3<F, R2, E2, (a: A) => B>) => Kind3<F, R & R2, E | E2, B>;
  readonly apFirst: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, A>;
  readonly apSecond: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, B>;
}

export interface PipeableApply3EP<F extends MatechsURIS> extends PipeableFunctor3<F> {
  readonly ap: <R, E, A, E2>(
    fa: Kind3<F, R, E, A>
  ) => <R2, B>(fab: Kind3<F, R2, E2, (a: A) => B>) => Kind3<F, AsyncContext & R & R2, E | E2, B>;
  readonly apFirst: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, AsyncContext & R & R2, E | E2, A>;
  readonly apSecond: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, AsyncContext & R & R2, E | E2, B>;
}

export interface PipeableApply3EC<F extends MatechsURIS, E> extends PipeableFunctor3EC<F, E> {
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
  readonly map: <A, B>(f: (a: A) => B) => <R>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>;
}

export interface Apply3E<F extends MatechsURIS> extends Functor3<F> {
  readonly ap: <R, E, A, B, R2, E2>(
    fab: Kind3<F, R, E, (a: A) => B>,
    fa: Kind3<F, R2, E2, A>
  ) => Kind3<F, R & R2, E | E2, B>;
}

export interface Applicative3EP<F extends MatechsURIS> extends Apply3EP<F> {
  readonly of: <R, E, A>(a: A) => Kind3<F, R, E, A>;
}

declare module "fp-ts/lib/TraversableWithIndex" {
  export interface TraverseWithIndex<T, I> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, E, B>(
      ta: HKT<T, A>,
      f: (i: I, a: A) => Kind3<F, R, E, B>
    ) => Kind3<F, AsyncContext & R, E, HKT<T, B>>;
  }
  export interface TraverseWithIndex1<T extends URIS, I> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, E, B>(
      ta: Kind<T, A>,
      f: (i: I, a: A) => Kind3<F, R, E, B>
    ) => Kind3<F, AsyncContext & R, E, Kind<T, B>>;
  }
  export interface TraverseWithIndex2<T extends URIS2, I> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <TE, A, R, FE, B>(
      ta: Kind2<T, TE, A>,
      f: (i: I, a: A) => Kind3<F, R, FE, B>
    ) => Kind3<F, AsyncContext & R, FE, Kind2<T, TE, B>>;
  }
  export interface TraverseWithIndex2C<T extends URIS2, I, E> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, FE, B>(
      ta: Kind2<T, E, A>,
      f: (i: I, a: A) => Kind3<F, R, FE, B>
    ) => Kind3<F, AsyncContext & R, FE, Kind2<T, E, B>>;
  }
}

declare module "fp-ts/lib/Witherable" {
  export interface Wither<W> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, E, B>(
      ta: HKT<W, A>,
      f: (a: A) => Kind3<F, R, E, Option<B>>
    ) => Kind3<F, AsyncContext & R, E, HKT<W, B>>;
  }
  export interface Wither1<W extends URIS> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, E, B>(
      ta: Kind<W, A>,
      f: (a: A) => Kind3<F, R, E, Option<B>>
    ) => Kind3<F, AsyncContext & R, E, Kind<W, B>>;
  }
  export interface Wither2<W extends URIS2> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <WE, A, R, FE, B>(
      ta: Kind2<W, WE, A>,
      f: (a: A) => Kind3<F, R, FE, Option<B>>
    ) => Kind3<F, AsyncContext & R, FE, Kind2<W, WE, B>>;
  }
  export interface Wither2C<W extends URIS2, E> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, FE, B>(
      ta: Kind2<W, E, A>,
      f: (a: A) => Kind3<F, R, FE, Option<B>>
    ) => Kind3<F, AsyncContext & R, FE, Kind2<W, E, B>>;
  }
  export interface Wither3<W extends URIS3> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <WR, WE, A, FR, FE, B>(
      ta: Kind3<W, WR, WE, A>,
      f: (a: A) => Kind3<F, FR, FE, Option<B>>
    ) => Kind3<F, AsyncContext & FR, FE, Kind3<W, WR, WE, B>>;
  }
  export interface Wilt<W> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, E, B, C>(
      wa: HKT<W, A>,
      f: (a: A) => Kind3<F, R, E, Either<B, C>>
    ) => Kind3<F, AsyncContext & R, E, Separated<HKT<W, B>, HKT<W, C>>>;
  }
  export interface Wilt1<W extends URIS> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, E, B, C>(
      wa: Kind<W, A>,
      f: (a: A) => Kind3<F, R, E, Either<B, C>>
    ) => Kind3<F, AsyncContext & R, E, Separated<Kind<W, B>, Kind<W, C>>>;
  }
  export interface Wilt2<W extends URIS2> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <WE, A, R, FE, B, C>(
      wa: Kind2<W, WE, A>,
      f: (a: A) => Kind3<F, R, FE, Either<B, C>>
    ) => Kind3<F, AsyncContext & R, FE, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>;
  }
  export interface Wilt2C<W extends URIS2, E> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, FE, B, C>(
      wa: Kind2<W, E, A>,
      f: (a: A) => Kind3<F, R, FE, Either<B, C>>
    ) => Kind3<F, AsyncContext & R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>;
  }
  export interface Wilt3<W extends URIS3> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <WR, WE, A, FR, FE, B, C>(
      wa: Kind3<W, WR, WE, A>,
      f: (a: A) => Kind3<F, FR, FE, Either<B, C>>
    ) => Kind3<F, AsyncContext & FR, FE, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>;
  }
}

declare module "fp-ts/lib/Traversable" {
  export interface Traverse<T> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, E, B>(
      ta: HKT<T, A>,
      f: (a: A) => Kind3<F, R, E, B>
    ) => Kind3<F, AsyncContext & R, E, HKT<T, B>>;
  }
  export interface Traverse1<T extends URIS> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, E, B>(
      ta: Kind<T, A>,
      f: (a: A) => Kind3<F, R, E, B>
    ) => Kind3<F, AsyncContext & R, E, Kind<T, B>>;
  }
  export interface Traverse2<T extends URIS2> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <TE, A, R, FE, B>(
      ta: Kind2<T, TE, A>,
      f: (a: A) => Kind3<F, R, FE, B>
    ) => Kind3<F, AsyncContext & R, FE, Kind2<T, TE, B>>;
  }
  export interface Traverse2C<T extends URIS2, E> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <A, R, FE, B>(
      ta: Kind2<T, E, A>,
      f: (a: A) => Kind3<F, R, FE, B>
    ) => Kind3<F, AsyncContext & R, FE, Kind2<T, E, B>>;
  }
  export interface Traverse3<T extends URIS3> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <TR, TE, A, FR, FE, B>(
      ta: Kind3<T, TR, TE, A>,
      f: (a: A) => Kind3<F, FR, FE, B>
    ) => Kind3<F, AsyncContext & FR, FE, Kind3<T, TR, TE, B>>;
  }
  export interface Sequence<T> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <R, E, A>(
      ta: HKT<T, Kind3<F, R, E, A>>
    ) => Kind3<F, AsyncContext & R, E, HKT<T, A>>;
  }
  export interface Sequence1<T extends URIS> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <R, E, A>(
      ta: Kind<T, Kind3<F, R, E, A>>
    ) => Kind3<F, AsyncContext & R, E, Kind<T, A>>;
  }
  export interface Sequence2<T extends URIS2> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <TE, R, FE, A>(
      ta: Kind2<T, TE, Kind3<F, R, FE, A>>
    ) => Kind3<F, AsyncContext & R, FE, Kind2<T, TE, A>>;
  }
  export interface Sequence2C<T extends URIS2, E> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <R, FE, A>(
      ta: Kind2<T, E, Kind3<F, R, FE, A>>
    ) => Kind3<F, AsyncContext & R, FE, Kind2<T, E, A>>;
  }
  export interface Sequence3<T extends URIS3> {
    <F extends MatechsURIS>(F: Applicative3EP<F>): <TR, TE, FR, FE, A>(
      ta: Kind3<T, TR, TE, Kind3<F, FR, FE, A>>
    ) => Kind3<F, AsyncContext & FR, FE, Kind3<T, TR, TE, A>>;
  }
  export interface TraverseComposition11<F extends URIS, G extends URIS> {
    <H extends MatechsURIS>(H: Applicative3EP<H>): <R, E, A, B>(
      fga: Kind<F, Kind<G, A>>,
      f: (a: A) => Kind3<H, R, E, B>
    ) => Kind3<H, AsyncContext & R, E, Kind<F, Kind<G, B>>>;
  }
  export interface SequenceComposition11<F extends URIS, G extends URIS> {
    <H extends MatechsURIS>(H: Applicative3EP<H>): <R, E, A>(
      fga: Kind<F, Kind<G, Kind3<H, R, E, A>>>
    ) => Kind3<H, AsyncContext & R, E, Kind<F, Kind<G, A>>>;
  }
}

export interface Apply3EP<F extends MatechsURIS> extends Functor3<F> {
  readonly CTX: "async";

  readonly ap: <R, E, A, B, R2, E2>(
    fab: Kind3<F, R, E, (a: A) => B>,
    fa: Kind3<F, R2, E2, A>
  ) => Kind3<F, AsyncContext & R & R2, E | E2, B>;
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
  ): (I extends Chain3EP<F>
    ? PipeableChain3EP<F>
    : I extends Chain3E<F>
    ? PipeableChain3E<F>
    : I extends Apply3EP<F>
    ? PipeableApply3EP<F>
    : I extends Apply3E<F>
    ? PipeableApply3E<F>
    : I extends Functor3<F>
    ? PipeableFunctor3<F>
    : {}) &
    (I extends Contravariant3<F> ? PipeableContravariant3<F> : {}) &
    (I extends FunctorWithIndex3<F, infer Ix> ? PipeableFunctorWithIndex3<F, Ix> : {}) &
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

export interface MonadThrow3EP<M extends MatechsURIS> extends Monad3EP<M> {
  readonly throwError: <E>(e: E) => Kind3<M, unknown, E, never>;
}

export interface MonadThrow3EC<M extends MatechsURIS, E> extends Monad3EC<M, E> {
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
  readonly fromOption: (onNone: () => E) => <R, A>(ma: Option<A>) => Kind3<F, R, E, A>;
  readonly fromEither: <R, A>(ma: Either<E, A>) => Kind3<F, R, E, A>;
  readonly fromPredicate: {
    <A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <U>(
      a: A
    ) => Kind3<F, U, E, B>;
    <A>(predicate: Predicate<A>, onFalse: (a: A) => E): <R>(a: A) => Kind3<F, R, E, A>;
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
