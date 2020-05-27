/* adapted from https://github.com/rzeigler/waveguide */

import type { CFunctor2, CFunctor2C } from "../Base"
import type { Kind2 } from "../Base/HKT"
import type { COf2, COf2C } from "../Base/Of"

import type { Either } from "."
import type { URI } from "./index"

export interface ChainRec2M<F extends URI> extends Chain2M<F> {
  readonly chainRec: <E, A, B>(
    a: A,
    f: (a: A) => Kind2<F, E, Either<A, B>>
  ) => Kind2<F, E, B>
}

export interface Chain2M<F extends URI> extends CFunctor2<F> {
  readonly chain: <A, B, E2>(
    f: (a: A) => Kind2<F, E2, B>
  ) => <E>(fa: Kind2<F, E, A>) => Kind2<F, E | E2, B>
}

export interface MonadThrow2M<M extends URI> extends Monad2M<M> {
  readonly throwError: <E, A>(e: E) => Kind2<M, E, A>
}

declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export interface Apply2M<F extends URI> extends CFunctor2<F> {
  readonly ap: <A, B, E2>(
    fa: Kind2<F, E2, A>
  ) => <E>(fab: Kind2<F, E, (a: A) => B>) => Kind2<F, E | E2, B>
}
export interface Apply2MC<F extends URI, E> extends CFunctor2C<F, E> {
  readonly ap: <A, B>(
    fa: Kind2<F, E, A>
  ) => (fab: Kind2<F, E, (a: A) => B>) => Kind2<F, E, B>
}

declare module "../Base/Apply" {
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
export interface Applicative2M<F extends URI> extends Apply2M<F>, COf2<F> {}
export interface Applicative2MC<F extends URI, E> extends Apply2MC<F, E>, COf2C<F, E> {}
export interface Monad2M<M extends URI> extends Chain2M<M>, COf2<M> {}
export interface CAlt2M<F extends URI> extends CFunctor2<F> {
  readonly alt: <E, A>(
    fy: () => Kind2<F, E, A>
  ) => <E2, A2>(fx: Kind2<F, E2, A2>) => Kind2<F, E | E2, A | A2>
}

declare module "../Do" {
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

  export function Do<M extends URI>(
    M: Monad2M<M> & Applicative2M<M>
  ): Do2MC<M, {}, never>
}
