import fc, { Arbitrary } from "fast-check"
import prand from "pure-rand"

import { UnionToIntersection, RTypeOf, ETypeOf } from "@matechs/core/Base/Apply"
import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"
import * as O from "@matechs/core/Option"
import * as S from "@matechs/core/Stream"

declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export const RandomGenURI = "@matechs/test/RandomGenURI"

export interface RandomGen {
  [RandomGenURI]: {
    randomGenerator: fc.Random
  }
}

export const provideGenerator = T.provideM(
  pipe(
    T.sync(() => new fc.Random(prand.mersenne(Math.random()))),
    T.map(
      (rnd): RandomGen => ({
        [RandomGenURI]: {
          randomGenerator: rnd
        }
      })
    )
  )
)

export interface Arb<R, A> extends S.Stream<unknown, R, never, A> {}

export const arb = <T0>(a: Arbitrary<T0>): Arb<RandomGen, T0> =>
  S.fromSource(
    M.encaseEffect(
      T.access((_: RandomGen) =>
        T.sync(() => O.some(a.generate(_[RandomGenURI].randomGenerator).value))
      )
    )
  )

export const propertyM = (iterations: number) => <
  NER extends Record<string, S.Stream<any, any, any, any>>
>(
  r: EnforceNonEmptyRecord<NER> & Record<string, S.Stream<any, any, any, any>>
) => <R>(
  f: (
    _: {
      [K in keyof NER]: [NER[K]] extends [S.Stream<any, any, any, infer A>] ? A : never
    }
  ) => T.Effect<
    unknown,
    R,
    {
      [K in keyof NER]: ETypeOf<NER[K]>
    }[keyof NER],
    void
  >
): T.AsyncRE<
  UnionToIntersection<
    {
      [K_2 in keyof NER]: unknown extends RTypeOf<NER[K_2]> ? never : RTypeOf<NER[K_2]>
    }[keyof NER]
  > &
    R,
  | { [K in keyof NER]: ETypeOf<NER[K]> }[keyof NER]
  | {
      [K in keyof NER]: [NER[K]] extends [S.Stream<any, any, infer E, any>] ? E : never
    }[keyof NER],
  void
> =>
  pipe(
    S.sequenceS<NER>(r),
    S.chain((x) => S.encaseEffect(f(x))),
    S.take(iterations),
    S.drain
  )

export const property = (iterations: number) => <
  NER extends Record<string, Arb<any, any>>
>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Arb<any, any>>
) => (
  f: (
    _: {
      [K in keyof NER]: [NER[K]] extends [S.Stream<any, any, any, infer A>] ? A : never
    }
  ) => void
): T.AsyncRE<
  UnionToIntersection<
    {
      [K in keyof NER]: unknown extends RTypeOf<NER[K]> ? never : RTypeOf<NER[K]>
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [S.Stream<any, any, infer E, any>] ? E : never
  }[keyof NER],
  void
> =>
  pipe(
    S.sequenceS<NER>(r),
    S.chain((x) => S.encaseEffect(T.sync(() => f(x)))),
    S.take(iterations),
    S.drain
  )
