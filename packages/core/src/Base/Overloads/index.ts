import type {} from "fp-ts-contrib/lib/Do"
import type { Bifunctor4 } from "fp-ts/lib/Bifunctor"
import type { Compactable4, Separated } from "fp-ts/lib/Compactable"
import type { Contravariant4 } from "fp-ts/lib/Contravariant"
import type { Either } from "fp-ts/lib/Either"
import type { Extend4 } from "fp-ts/lib/Extend"
import type { Filterable4 } from "fp-ts/lib/Filterable"
import type { FilterableWithIndex4 } from "fp-ts/lib/FilterableWithIndex"
import type { Foldable4 } from "fp-ts/lib/Foldable"
import type { FoldableWithIndex4 } from "fp-ts/lib/FoldableWithIndex"
import type { Functor4 } from "fp-ts/lib/Functor"
import type { FunctorWithIndex4 } from "fp-ts/lib/FunctorWithIndex"
import type { Kind, Kind2, Kind4, URIS, URIS2 } from "fp-ts/lib/HKT"
import type { Option } from "fp-ts/lib/Option"
import type { Profunctor4 } from "fp-ts/lib/Profunctor"
import type { Semigroupoid4 } from "fp-ts/lib/Semigroupoid"
import type { PipeableFunctor4 } from "fp-ts/lib/pipeable"

import type { Predicate, Refinement } from "../../Function"
import type { GE } from "../../Utils"
import { MaURIS } from "../HKT"

export interface Apply4E<F extends MaURIS> extends Functor4<F> {
  readonly ap: <S1, S2, R, E, A, B, R2, E2>(
    fab: Kind4<F, S1, R, E, (a: A) => B>,
    fa: Kind4<F, S2, R2, E2, A>
  ) => Kind4<F, S1 | S2, R & R2, E | E2, B>
}

export interface Apply4EP<F extends MaURIS> extends Functor4<F> {
  _CTX: "async"
  readonly ap: <S1, S2, R, E, A, B, R2, E2>(
    fab: Kind4<F, S1, R, E, (a: A) => B>,
    fa: Kind4<F, S2, R2, E2, A>
  ) => Kind4<F, unknown, R & R2, E | E2, B> // unknown => parallel => async
}

export interface Chain4E<F extends MaURIS> extends Apply4E<F> {
  readonly chain: <S1, S2, R, E, A, R2, E2, B>(
    fa: Kind4<F, S1, R, E, A>,
    f: (a: A) => Kind4<F, S2, R2, E2, B>
  ) => Kind4<F, S1 | S2, R & R2, E | E2, B>
}

export interface Chain4EP<F extends MaURIS> extends Apply4EP<F> {
  readonly chain: <S1, S2, R, E, A, R2, E2, B>(
    fa: Kind4<F, S1, R, E, A>,
    f: (a: A) => Kind4<F, S2, R2, E2, B>
  ) => Kind4<F, S1 | S2, R & R2, E | E2, B>
}

export interface Applicative4E<F extends MaURIS> extends Apply4E<F> {
  readonly of: <A>(a: A) => Kind4<F, never, unknown, never, A>
}

export interface Applicative4EP<F extends MaURIS> extends Apply4EP<F> {
  readonly of: <A>(a: A) => Kind4<F, never, unknown, never, A>
}

export interface Alt4E<F extends MaURIS> extends Functor4<F> {
  readonly alt: <S1, S2, R, R2, E, E2, A, B>(
    fx: Kind4<F, S1, R, E, A>,
    fy: () => Kind4<F, S2, R2, E2, B>
  ) => Kind4<F, S1 | S2, R & R2, E2, A | B>
}

export interface Monad4E<M extends MaURIS> extends Applicative4E<M>, Chain4E<M> {}
export interface Monad4EP<M extends MaURIS> extends Applicative4EP<M>, Chain4EP<M> {}
export interface Monad4EC<M extends MaURIS, E>
  extends Applicative4EC<M, E>,
    Chain4EC<M, E> {}
export interface Monad4ECP<M extends MaURIS, E>
  extends Applicative4ECP<M, E>,
    Chain4ECP<M, E> {}

export interface Applicative4EC<F extends MaURIS, E> extends Apply4EC<F, E> {
  readonly of: <A>(a: A) => Kind4<F, never, unknown, E, A>
}

export interface Applicative4ECP<F extends MaURIS, E> extends Apply4ECP<F, E> {
  readonly of: <A>(a: A) => Kind4<F, never, unknown, E, A>
}

export interface Apply4EC<F extends MaURIS, E> extends Functor4EC<F, E> {
  readonly ap: <S1, S2, R, R2, A, B>(
    fab: Kind4<F, S1, R, E, (a: A) => B>,
    fa: Kind4<F, S2, R2, E, A>
  ) => Kind4<F, S1 | S2, R & R2, E, B>
}

export interface Apply4ECP<F extends MaURIS, E> extends Functor4EC<F, E> {
  _CTX: "async"
  readonly ap: <S1, S2, R, R2, A, B>(
    fab: Kind4<F, S1, R, E, (a: A) => B>,
    fa: Kind4<F, S2, R2, E, A>
  ) => Kind4<F, unknown, R & R2, E, B>
}

export interface Chain4EC<F extends MaURIS, E> extends Apply4EC<F, E> {
  readonly chain: <S1, S2, R, A, R2, B>(
    fa: Kind4<F, S1, R, E, A>,
    f: (a: A) => Kind4<F, S2, R2, E, B>
  ) => Kind4<F, S1 | S2, R & R2, E, B>
}

export interface Chain4ECP<F extends MaURIS, E> extends Apply4ECP<F, E> {
  readonly chain: <S1, S2, R, A, R2, B>(
    fa: Kind4<F, S1, R, E, A>,
    f: (a: A) => Kind4<F, S2, R2, E, B>
  ) => Kind4<F, S1 | S2, R & R2, E, B>
}

export interface Functor4EC<F extends MaURIS, E> {
  readonly URI: F
  readonly _E: E
  readonly map: <S, R, A, B>(
    fa: Kind4<F, S, R, E, A>,
    f: (a: A) => B
  ) => Kind4<F, S, R, E, B>
}

declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

export type STypeOf<X> = X extends GE<infer _S, infer _R, infer _E, infer _A>
  ? _S
  : never

export type ATypeOf<X> = X extends GE<infer _S, infer _R, infer _E, infer _A>
  ? _A
  : never

export type ETypeOf<X> = X extends GE<infer _S, infer _R, infer _E, infer _A>
  ? _E
  : never

export type RTypeOf<X> = X extends GE<infer _S, infer _R, infer _E, infer _A>
  ? _R
  : never

export type EnvOf<
  R extends Record<string, GE<any, any, any, any>>
> = UnionToIntersection<
  {
    [K in keyof R]: unknown extends RTypeOf<R[K]> ? never : RTypeOf<R[K]>
  }[keyof R]
>

export type SOf<R extends Record<string, GE<any, any, any, any>>> = {
  [K in keyof R]: STypeOf<R[K]>
}[keyof R]

export interface Do4CE<M extends MaURIS, Q, S extends object, U, L> {
  do: <Q1, E, R>(ma: Kind4<M, Q1, R, E, unknown>) => Do4CE<M, Q | Q1, S, U & R, L | E>
  doL: <Q1, E, R>(
    f: (s: S) => Kind4<M, Q1, R, E, unknown>
  ) => Do4CE<M, Q | Q1, S, U & R, L | E>
  bind: <N extends string, Q1, E, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind4<M, Q1, R, E, A>
  ) => Do4CE<M, Q | Q1, S & { [K in N]: A }, U & R, L | E>
  bindL: <N extends string, Q1, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind4<M, Q1, R, E, A>
  ) => Do4CE<M, Q | Q1, S & { [K in N]: A }, U & R, L | E>
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U, L>
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U, L>
  sequenceS: <R extends Record<string, Kind4<M, any, any, any, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE<
    M,
    SOf<R> | Q,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >
  sequenceSL: <R extends Record<string, Kind4<M, any, any, any, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE<
    M,
    SOf<R> | Q,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >
  return: <A>(f: (s: S) => A) => Kind4<M, Q, U, L, A>
  done: () => Kind4<M, Q, U, L, S>
}

export interface Do4CE_<M extends MaURIS, Q, S extends object, U, L> {
  do: <Q1, R>(ma: Kind4<M, Q1, R, L, unknown>) => Do4CE_<M, Q | Q1, S, U & R, L>
  doL: <Q1, R>(
    f: (s: S) => Kind4<M, Q1, R, L, unknown>
  ) => Do4CE_<M, Q | Q1, S, U & R, L>
  bind: <N extends string, Q1, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind4<M, Q1, R, L, A>
  ) => Do4CE_<M, Q | Q1, S & { [K in N]: A }, U & R, L>
  bindL: <N extends string, Q1, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind4<M, Q1, R, L, A>
  ) => Do4CE_<M, Q | Q1, S & { [K in N]: A }, U & R, L>
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U, L>
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U, L>
  sequenceS: <R extends Record<string, Kind4<M, any, any, L, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE_<M, SOf<R> | Q, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L>
  sequenceSL: <R extends Record<string, Kind4<M, any, any, L, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE_<M, SOf<R> | Q, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L>
  return: <A>(f: (s: S) => A) => Kind4<M, Q, U, L, A>
  done: () => Kind4<M, Q, U, L, S>
}

declare module "fp-ts-contrib/lib/Do" {
  export function Do<M extends MaURIS>(
    M: Monad4E<M>
  ): Do4CE<M, never, {}, unknown, never>
  export function Do<M extends MaURIS>(
    M: Monad4EP<M>
  ): Do4CE<M, unknown, {}, unknown, never>
  export function Do<M extends MaURIS, E>(
    M: Monad4EC<M, E>
  ): Do4CE_<M, never, {}, unknown, E>
  export function Do<M extends MaURIS, E>(
    M: Monad4ECP<M, E>
  ): Do4CE_<M, unknown, {}, unknown, E>
}

declare module "fp-ts/lib/Apply" {
  export function sequenceS<F extends MaURIS>(
    F: Apply4E<F>
  ): <NER extends Record<string, Kind4<F, any, any, any, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Kind4<F, any, any, any, any>>
  ) => Kind4<
    F,
    SOf<NER>,
    EnvOf<NER>,
    {
      [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, infer E, any>] ? E : never
    }[keyof NER],
    {
      [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
    }
  >

  export function sequenceS<F extends MaURIS, E>(
    F: Apply4ECP<F, E>
  ): <NER extends Record<string, Kind4<F, any, any, E, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Kind4<F, any, any, E, any>>
  ) => Kind4<
    F,
    unknown,
    EnvOf<NER>,
    E,
    {
      [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
    }
  >

  export function sequenceS<F extends MaURIS, E>(
    F: Apply4EC<F, E>
  ): <NER extends Record<string, Kind4<F, any, any, E, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Kind4<F, any, any, E, any>>
  ) => Kind4<
    F,
    SOf<NER>,
    EnvOf<NER>,
    E,
    {
      [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
    }
  >

  export function sequenceS<F extends MaURIS>(
    F: Apply4EP<F>
  ): <NER extends Record<string, Kind4<F, any, any, any, any>>>(
    r: EnforceNonEmptyRecord<NER> & Record<string, Kind4<F, any, any, any, any>>
  ) => Kind4<
    F,
    unknown,
    EnvOf<NER>,
    {
      [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, infer E, any>] ? E : never
    }[keyof NER],
    {
      [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
    }
  >

  export function sequenceT<F extends MaURIS>(
    F: Apply4EP<F>
  ): <T extends Array<Kind4<F, any, any, any, any>>>(
    ...t: T & {
      0: Kind4<F, any, any, any, any>
    }
  ) => Kind4<
    F,
    unknown,
    UnionToIntersection<
      {
        [K in keyof T]: [T[K]] extends [Kind4<F, any, infer R, any, any>]
          ? unknown extends R
            ? never
            : R
          : never
      }[number]
    >,
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, any, infer E, any>] ? E : never
    }[number],
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
    }
  >

  export function sequenceT<F extends MaURIS>(
    F: Apply4E<F>
  ): <T extends Array<Kind4<F, any, any, any, any>>>(
    ...t: T & {
      0: Kind4<F, any, any, any, any>
    }
  ) => Kind4<
    F,
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, infer S, any, any, any>] ? S : never
    }[number],
    UnionToIntersection<
      {
        [K in keyof T]: [T[K]] extends [Kind4<F, any, infer R, any, any>]
          ? unknown extends R
            ? never
            : R
          : never
      }[number]
    >,
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, any, infer E, any>] ? E : never
    }[number],
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
    }
  >

  export function sequenceT<F extends MaURIS, E>(
    F: Apply4ECP<F, E>
  ): <T extends Array<Kind4<F, any, any, E, any>>>(
    ...t: T & {
      0: Kind4<F, any, any, E, any>
    }
  ) => Kind4<
    F,
    unknown,
    UnionToIntersection<
      {
        [K in keyof T]: [T[K]] extends [Kind4<F, any, infer R, any, any>]
          ? unknown extends R
            ? never
            : R
          : never
      }[number]
    >,
    E,
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
    }
  >

  export function sequenceT<F extends MaURIS, E>(
    F: Apply4EC<F, E>
  ): <T extends Array<Kind4<F, any, any, E, any>>>(
    ...t: T & {
      0: Kind4<F, any, any, E, any>
    }
  ) => Kind4<
    F,
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, infer S, any, any, any>] ? S : never
    }[number],
    UnionToIntersection<
      {
        [K in keyof T]: [T[K]] extends [Kind4<F, any, infer R, any, any>]
          ? unknown extends R
            ? never
            : R
          : never
      }[number]
    >,
    E,
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
    }
  >
}

export interface PipeableChain4E<F extends MaURIS> extends PipeableApply4E<F> {
  readonly chain: <S1, R, E, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2, E2>(ma: Kind4<F, S2, R2, E2, A>) => Kind4<F, S1 | S2, R & R2, E | E2, B>
  readonly chainFirst: <S1, R, E, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2, E2>(ma: Kind4<F, S2, R2, E2, A>) => Kind4<F, S1 | S2, R & R2, E | E2, A>
  readonly flatten: <S1, S2, R, E, R2, E2, A>(
    mma: Kind4<F, S1, R, E, Kind4<F, S2, R2, E2, A>>
  ) => Kind4<F, S1 | S2, R & R2, E | E2, A>
}

export interface PipeableChain4EP<F extends MaURIS> extends PipeableApply4EP<F> {
  readonly chain: <S1, R, E, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2, E2>(ma: Kind4<F, S2, R2, E2, A>) => Kind4<F, S1 | S2, R & R2, E | E2, B>
  readonly chainFirst: <S1, R, E, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2, E2>(ma: Kind4<F, S2, R2, E2, A>) => Kind4<F, S1 | S2, R & R2, E | E2, A>
  readonly flatten: <S1, S2, R, E, R2, E2, A>(
    mma: Kind4<F, S1, R, E, Kind4<F, S2, R2, E2, A>>
  ) => Kind4<F, S1 | S2, R & R2, E | E2, A>
}

export interface PipeableChain4EC<F extends MaURIS, E> extends PipeableApply4EC<F, E> {
  readonly chain: <S1, R, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2>(ma: Kind4<F, S2, R2, E, A>) => Kind4<F, S1 | S2, R & R2, E, B>
  readonly chainFirst: <S1, R, A, B>(
    f: (a: A) => Kind4<F, S1, R, E, B>
  ) => <S2, R2>(ma: Kind4<F, S2, R2, E, A>) => Kind4<F, S1 | S2, R & R2, E, A>
  readonly flatten: <S1, S2, R, R2, A>(
    mma: Kind4<F, S1, R, E, Kind4<F, S2, R2, E, A>>
  ) => Kind4<F, S1 | S2, R & R2, E, A>
}

export interface PipeableApply4E<F extends MaURIS> extends PipeableFunctor4<F> {
  readonly ap: <S1, R, E, A, E2>(
    fa: Kind4<F, S1, R, E, A>
  ) => <S2, R2, B>(
    fab: Kind4<F, S2, R2, E2, (a: A) => B>
  ) => Kind4<F, S1 | S2, R & R2, E | E2, B>
  readonly apFirst: <S1, R, E, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2, E2>(
    fa: Kind4<F, S2, R2, E2, A>
  ) => Kind4<F, S1 | S2, R & R2, E | E2, A>
  readonly apSecond: <S1, R, E, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2, E2>(
    fa: Kind4<F, S2, R2, E2, A>
  ) => Kind4<F, S1 | S2, R & R2, E | E2, B>
}

export interface PipeableApply4EP<F extends MaURIS> extends PipeableFunctor4<F> {
  readonly ap: <S1, R, E, A, E2>(
    fa: Kind4<F, S1, R, E, A>
  ) => <S2, R2, B>(
    fab: Kind4<F, S2, R2, E2, (a: A) => B>
  ) => Kind4<F, unknown, R & R2, E | E2, B>
  readonly apFirst: <S1, R, E, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2, E2>(
    fa: Kind4<F, S2, R2, E2, A>
  ) => Kind4<F, unknown, R & R2, E | E2, A>
  readonly apSecond: <S1, R, E, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2, E2>(
    fa: Kind4<F, S2, R2, E2, A>
  ) => Kind4<F, unknown, R & R2, E | E2, B>
}

export interface PipeableApply4EC<F extends MaURIS, E>
  extends PipeableFunctor4EC<F, E> {
  readonly ap: <S1, R, A>(
    fa: Kind4<F, S1, R, E, A>
  ) => <S2, B, R2>(
    fab: Kind4<F, S2, R2, E, (a: A) => B>
  ) => Kind4<F, S1 | S2, R & R2, E, B>
  readonly apFirst: <S1, R, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2>(fa: Kind4<F, S2, R2, E, A>) => Kind4<F, S1 | S2, R & R2, E, A>
  readonly apSecond: <S1, R, B>(
    fb: Kind4<F, S1, R, E, B>
  ) => <A, S2, R2>(fa: Kind4<F, S2, R2, E, A>) => Kind4<F, S1 | S2, R & R2, E, B>
}

export interface PipeableFunctor4EC<F extends MaURIS, E> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <S, R>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
}

export interface PipeableMonadThrow4E<F extends MaURIS> {
  readonly fromOption: <E>(
    onNone: () => E
  ) => <A>(ma: Option<A>) => Kind4<F, never, unknown, E, A>
  readonly fromEither: <E, A>(ma: Either<E, A>) => Kind4<F, never, unknown, E, A>
  readonly fromPredicate: {
    <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
      a: A
    ) => Kind4<F, never, unknown, E, B>
    <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (
      a: A
    ) => Kind4<F, never, unknown, E, A>
  }
  readonly filterOrElse: {
    <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <S, R>(
      ma: Kind4<F, S, R, E, A>
    ) => Kind4<F, S, R, E, B>
    <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): <S, R>(
      ma: Kind4<F, S, R, E, A>
    ) => Kind4<F, S, R, E, A>
  }
}

export interface PipeableAlt4E<F extends MaURIS> {
  readonly alt: <S1, R, E, A>(
    that: () => Kind4<F, S1, R, E, A>
  ) => <S2, R2, E2>(fa: Kind4<F, S1 | S2, R2, E2, A>) => Kind4<F, S1 | S2, R & R2, E, A>
}

declare module "fp-ts/lib/pipeable" {
  export function pipeable<F extends MaURIS, I>(
    I: {
      URI: F
    } & I
  ): (I extends Chain4E<F>
    ? PipeableChain4E<F>
    : I extends Chain4EP<F>
    ? PipeableChain4EP<F>
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
    (I extends MonadThrow4E<F> ? PipeableMonadThrow4E<F> : {})
  export function pipeable<F extends MaURIS, I, E>(
    I: {
      URI: F
    } & I
  ): (I extends Chain4EC<F, E>
    ? PipeableChain4EC<F, E>
    : I extends Apply4EC<F, E>
    ? PipeableApply4EC<F, E>
    : I extends Functor4EC<F, E>
    ? PipeableFunctor4EC<F, E>
    : {}) &
    (I extends Alt4EC<F, E> ? PipeableAlt4EC<F, E> : {}) &
    (I extends MonadThrow4EC<F, E> ? PipeableMonadThrow4<F> : {})
}

export interface MonadThrow4E<M extends MaURIS> extends Monad4E<M> {
  readonly throwError: <E>(e: E) => Kind4<M, never, unknown, E, never>
}

export interface MonadThrow4EP<M extends MaURIS> extends Monad4EP<M> {
  readonly throwError: <E>(e: E) => Kind4<M, never, unknown, E, never>
}

export interface MonadThrow4EC<M extends MaURIS, E> extends Monad4EC<M, E> {
  readonly throwError: (e: E) => Kind4<M, never, unknown, E, never>
}

export interface MonadThrow4ECP<M extends MaURIS, E> extends Monad4ECP<M, E> {
  readonly throwError: (e: E) => Kind4<M, never, unknown, E, never>
}

export interface Alt4EC<F extends MaURIS, E> extends Functor4EC<F, E> {
  readonly alt: <S1, S2, R, R2, A>(
    fx: Kind4<F, S1, R, E, A>,
    fy: () => Kind4<F, S2, R2, E, A>
  ) => Kind4<F, S1 | S2, R & R2, E, A>
}

export interface PipeableAlt4EC<F extends MaURIS, E> {
  readonly alt: <S1, R, A>(
    that: () => Kind4<F, S1, R, E, A>
  ) => <S2, R2>(fa: Kind4<F, S2, R2, E, A>) => Kind4<F, S1 | S2, R & R2, E, A>
}

export interface PipeableMonadThrow4EC<F extends MaURIS, E> {
  readonly fromOption: (
    onNone: () => E
  ) => <A>(ma: Option<A>) => Kind4<F, never, unknown, E, A>
  readonly fromEither: <A>(ma: Either<E, A>) => Kind4<F, never, unknown, E, A>
  readonly fromPredicate: {
    <A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
      a: A
    ) => Kind4<F, never, unknown, E, B>
    <A>(predicate: Predicate<A>, onFalse: (a: A) => E): (
      a: A
    ) => Kind4<F, never, unknown, E, A>
  }
  readonly filterOrElse: {
    <A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <S, R>(
      ma: Kind4<F, S, R, E, A>
    ) => Kind4<F, S, R, E, B>
    <A>(predicate: Predicate<A>, onFalse: (a: A) => E): <S, R>(
      ma: Kind4<F, S, R, E, A>
    ) => Kind4<F, S, R, E, A>
  }
}

declare module "fp-ts/lib/Traversable" {
  export interface Traverse1<T extends URIS> {
    <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
      ta: Kind<T, A>,
      f: (a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, unknown, R, E, Kind<T, B>>
    <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
      ta: Kind<T, A>,
      f: (a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, S, R, E, Kind<T, B>>
    <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, E, B>(
      ta: Kind<T, A>,
      f: (a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, unknown, R, E, Kind<T, B>>
    <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, E, B>(
      ta: Kind<T, A>,
      f: (a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, S, R, E, Kind<T, B>>
  }
  export interface Sequence1<T extends URIS> {
    <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <S, R, A>(
      ta: Kind<T, Kind4<F, S, R, E, A>>
    ) => Kind4<F, unknown, R, E, Kind<T, A>>
    <F extends MaURIS, E>(F: Applicative4EC<F, E>): <S, R, A>(
      ta: Kind<T, Kind4<F, S, R, E, A>>
    ) => Kind4<F, S, R, E, Kind<T, A>>
    <F extends MaURIS>(F: Applicative4EP<F>): <S, R, E, A>(
      ta: Kind<T, Kind4<F, S, R, E, A>>
    ) => Kind4<F, unknown, R, E, Kind<T, A>>
    <F extends MaURIS>(F: Applicative4E<F>): <S, R, E, A>(
      ta: Kind<T, Kind4<F, S, R, E, A>>
    ) => Kind4<F, S, R, E, Kind<T, A>>
  }
  export interface Traverse2<T extends URIS2> {
    <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <TE, A, S, R, B>(
      ta: Kind2<T, TE, A>,
      f: (a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, unknown, R, E, Kind2<T, TE, B>>
    <F extends MaURIS, E>(F: Applicative4EC<F, E>): <TE, A, S, R, B>(
      ta: Kind2<T, TE, A>,
      f: (a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, S, R, E, Kind2<T, TE, B>>
    <F extends MaURIS>(F: Applicative4EP<F>): <TE, A, S, R, FE, B>(
      ta: Kind2<T, TE, A>,
      f: (a: A) => Kind4<F, S, R, FE, B>
    ) => Kind4<F, unknown, R, FE, Kind2<T, TE, B>>
    <F extends MaURIS>(F: Applicative4E<F>): <TE, A, S, R, FE, B>(
      ta: Kind2<T, TE, A>,
      f: (a: A) => Kind4<F, S, R, FE, B>
    ) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  }
  export interface Sequence2<T extends URIS2> {
    <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <TE, S, R, A>(
      ta: Kind2<T, E, Kind4<F, S, R, E, A>>
    ) => Kind4<F, unknown, R, E, Kind2<T, TE, A>>
    <F extends MaURIS, E>(F: Applicative4EC<F, E>): <TE, S, R, A>(
      ta: Kind2<T, E, Kind4<F, S, R, E, A>>
    ) => Kind4<F, S, R, E, Kind2<T, TE, A>>
    <F extends MaURIS>(F: Applicative4EP<F>): <TE, S, R, FE, A>(
      ta: Kind2<T, TE, Kind4<F, S, R, FE, A>>
    ) => Kind4<F, unknown, R, FE, Kind2<T, TE, A>>
    <F extends MaURIS>(F: Applicative4E<F>): <TE, S, R, FE, A>(
      ta: Kind2<T, TE, Kind4<F, S, R, FE, A>>
    ) => Kind4<F, S, R, FE, Kind2<T, TE, A>>
  }
}

declare module "fp-ts/lib/Witherable" {
  export interface Wilt1<W extends URIS> {
    <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B, C>(
      wa: Kind<W, A>,
      f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
    ) => Kind4<F, unknown, R, E, Separated<Kind<W, B>, Kind<W, C>>>
    <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B, C>(
      wa: Kind<W, A>,
      f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
    ) => Kind4<F, S, R, E, Separated<Kind<W, B>, Kind<W, C>>>
    <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, E, B, C>(
      wa: Kind<W, A>,
      f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
    ) => Kind4<F, unknown, R, E, Separated<Kind<W, B>, Kind<W, C>>>
    <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, E, B, C>(
      wa: Kind<W, A>,
      f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
    ) => Kind4<F, S, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  }
  export interface Wither1<W extends URIS> {
    <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
      ta: Kind<W, A>,
      f: (a: A) => Kind4<F, S, R, E, Option<B>>
    ) => Kind4<F, unknown, R, E, Kind<W, B>>
    <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
      ta: Kind<W, A>,
      f: (a: A) => Kind4<F, S, R, E, Option<B>>
    ) => Kind4<F, S, R, E, Kind<W, B>>
    <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, E, B>(
      ta: Kind<W, A>,
      f: (a: A) => Kind4<F, unknown, R, E, Option<B>>
    ) => Kind4<F, unknown, R, E, Kind<W, B>>
    <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, E, B>(
      ta: Kind<W, A>,
      f: (a: A) => Kind4<F, S, R, E, Option<B>>
    ) => Kind4<F, S, R, E, Kind<W, B>>
  }
}

declare module "fp-ts/lib/TraversableWithIndex" {
  export interface TraverseWithIndex1<T extends URIS, I> {
    <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
      ta: Kind<T, A>,
      f: (i: I, a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, unknown, R, E, Kind<T, B>>
    <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
      ta: Kind<T, A>,
      f: (i: I, a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, S, R, E, Kind<T, B>>
    <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, E, B>(
      ta: Kind<T, A>,
      f: (i: I, a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, unknown, R, E, Kind<T, B>>
    <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, E, B>(
      ta: Kind<T, A>,
      f: (i: I, a: A) => Kind4<F, S, R, E, B>
    ) => Kind4<F, S, R, E, Kind<T, B>>
  }
}
