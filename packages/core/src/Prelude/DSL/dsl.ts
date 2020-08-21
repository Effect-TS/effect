import * as A from "@effect-ts/system/Array"

import type { Augmented, Has } from "../../Classic/Has"
import { HasURI } from "../../Classic/Has"
import { constant, flow, pipe, tuple } from "../../Function"
import type { EnforceNonEmptyRecord } from "../../Utils"
import type { Any } from "../Any"
import type { AssociativeFlatten } from "../AssociativeFlatten"
import type { Applicative, Monad } from "../Combined"
import type { Covariant } from "../Covariant"
import type { Access, Provide } from "../FX"
import type * as HKT from "../HKT"

export function succeedF<F extends HKT.URIS, C = HKT.Auto>(
  F: Any<F, C> & Covariant<F, C>
): <N extends string, K, SI, SO, A>(
  a: A
) => HKT.Kind<
  F,
  C,
  HKT.OrFix<"N", C, N>,
  HKT.OrFix<"K", C, K>,
  SI,
  SO,
  HKT.OrFix<"X", C, HKT.Initial<C, "X">>,
  HKT.OrFix<"I", C, HKT.Initial<C, "I">>,
  HKT.OrFix<"S", C, HKT.Initial<C, "S">>,
  HKT.OrFix<"R", C, HKT.Initial<C, "R">>,
  HKT.OrFix<"E", C, HKT.Initial<C, "E">>,
  A
>
export function succeedF(
  F: Any<[HKT.UF_]> & Covariant<[HKT.UF_]>
): <A>(a: A) => HKT.F_<A> {
  return <A>(a: A) => F.map(constant(a))(F.any())
}

export function chainF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <N2 extends string, K2, SO, SO2, X2, I2, S2, R2, E2, A, B>(
  f: (a: A) => HKT.KindFix<F, C, N2, K2, SO, SO2, X2, I2, S2, R2, E2, B>
) => <N extends string, K, SI, X, I, S, R, E>(
  fa: HKT.KindFix<
    F,
    C,
    N,
    K,
    SI,
    SO,
    HKT.Intro<C, "X", X2, X>,
    HKT.Intro<C, "I", I2, I>,
    HKT.Intro<C, "S", S2, S>,
    HKT.Intro<C, "R", R2, R>,
    HKT.Intro<C, "E", E2, E>,
    A
  >
) => HKT.KindFix<
  F,
  C,
  N2,
  K2,
  SI,
  SO2,
  HKT.Mix<C, "X", [X2, X]>,
  HKT.Mix<C, "I", [I2, I]>,
  HKT.Mix<C, "S", [S2, S]>,
  HKT.Mix<C, "R", [R2, R]>,
  HKT.Mix<C, "X", [E2, E]>,
  B
>
export function chainF(F: Monad<[HKT.UF_]>) {
  return <A, B>(f: (a: A) => HKT.F_<B>) => flow(F.map(f), F.flatten)
}

export function accessMF<F extends HKT.URIS, C = HKT.Auto>(
  F: Access<F, C> & AssociativeFlatten<F, C>
): <
  N extends string,
  K,
  SI,
  SO,
  A,
  X = HKT.INIT<F, C, "X">,
  I = HKT.INIT<F, C, "I">,
  S = HKT.INIT<F, C, "S">,
  R = HKT.INIT<F, C, "R">,
  E = HKT.INIT<F, C, "E">,
  X2 = HKT.INIT<F, C, "X">,
  I2 = HKT.INIT<F, C, "I">,
  S2 = HKT.INIT<F, C, "S">,
  R2 = HKT.INIT<F, C, "R">,
  E2 = HKT.INIT<F, C, "E">
>(
  f: (
    r: HKT.AccessType<F, C, "R", X2, I2, S2, R2, E2>
  ) => HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, A>
) => HKT.KindFix<
  F,
  C,
  N,
  K,
  SI,
  SO,
  HKT.MixTypes<F, C, "X", "R", X, I, S, R, E, X2, I2, S2, R2, E2>,
  HKT.MixTypes<F, C, "I", "R", X, I, S, R, E, X2, I2, S2, R2, E2>,
  HKT.MixTypes<F, C, "S", "R", X, I, S, R, E, X2, I2, S2, R2, E2>,
  HKT.MixTypes<F, C, "R", "R", X, I, S, R, E, X2, I2, S2, R2, E2>,
  HKT.MixTypes<F, C, "E", "R", X, I, S, R, E, X2, I2, S2, R2, E2>,
  A
>
export function accessMF(
  F: Access<[HKT.UF___]> & AssociativeFlatten<[HKT.UF___]>
): <R, E, A>(f: (r: R) => HKT.F___<R, E, A>) => HKT.F___<R, E, A> {
  return flow(F.access, F.flatten)
}

export function sequenceSF<F extends HKT.URIS, C = HKT.Auto>(
  F: Applicative<F, C>
): <
  X,
  I,
  S,
  R,
  E,
  SIO,
  NER extends Record<
    string,
    HKT.Kind<
      F,
      C,
      HKT.OrFix<"N", C, any>,
      HKT.OrFix<"K", C, any>,
      SIO,
      SIO,
      HKT.OrFix<"X", C, HKT.Intro<C, "X", X, any>>,
      HKT.OrFix<"I", C, HKT.Intro<C, "I", I, any>>,
      HKT.OrFix<"S", C, HKT.Intro<C, "S", S, any>>,
      HKT.OrFix<"R", C, HKT.Intro<C, "R", R, any>>,
      HKT.OrFix<"E", C, HKT.Intro<C, "E", E, any>>,
      any
    >
  >
>(
  r: EnforceNonEmptyRecord<NER> &
    Record<
      string,
      HKT.Kind<
        F,
        C,
        HKT.OrFix<"N", C, any>,
        HKT.OrFix<"K", C, any>,
        SIO,
        SIO,
        HKT.OrFix<"X", C, HKT.Intro<C, "X", X, any>>,
        HKT.OrFix<"I", C, HKT.Intro<C, "I", I, any>>,
        HKT.OrFix<"S", C, HKT.Intro<C, "S", S, any>>,
        HKT.OrFix<"R", C, HKT.Intro<C, "R", R, any>>,
        HKT.OrFix<"E", C, HKT.Intro<C, "E", E, any>>,
        any
      >
    >
) => HKT.Kind<
  F,
  C,
  HKT.OrFix<
    "N",
    C,
    {
      [K in keyof NER]: HKT.InferN<F, NER[K]>
    }[keyof NER]
  >,
  HKT.OrFix<
    "K",
    C,
    {
      [K in keyof NER]: HKT.InferK<F, NER[K]>
    }[keyof NER]
  >,
  SIO,
  SIO,
  HKT.OrFix<
    "X",
    C,
    HKT.MixStruct<
      C,
      "X",
      X,
      {
        [K in keyof NER]: HKT.InferX<F, NER[K]>
      }
    >
  >,
  HKT.OrFix<
    "I",
    C,
    HKT.MixStruct<
      C,
      "I",
      I,
      {
        [K in keyof NER]: HKT.InferI<F, NER[K]>
      }
    >
  >,
  HKT.OrFix<
    "S",
    C,
    HKT.MixStruct<
      C,
      "S",
      S,
      {
        [K in keyof NER]: HKT.InferS<F, NER[K]>
      }
    >
  >,
  HKT.OrFix<
    "R",
    C,
    HKT.MixStruct<
      C,
      "R",
      R,
      {
        [K in keyof NER]: HKT.InferR<F, NER[K]>
      }
    >
  >,
  HKT.OrFix<
    "E",
    C,
    HKT.MixStruct<
      C,
      "E",
      E,
      {
        [K in keyof NER]: HKT.InferE<F, NER[K]>
      }
    >
  >,
  {
    [K in keyof NER]: HKT.InferA<F, NER[K]>
  }
>
export function sequenceSF(
  F: Applicative<[HKT.UF_]>
): (r: Record<string, HKT.F_<any>>) => HKT.F_<Record<string, any>> {
  return (r) =>
    pipe(
      Object.keys(r).map((k) => tuple(k, r[k])),
      A.reduceRight(succeedF(F)([] as readonly (readonly [string, any])[]), (a, b) =>
        pipe(
          b,
          F.both(a[1]),
          F.map(([x, y]) => [...x, tuple(a[0], y)])
        )
      ),
      F.map((a) => {
        const res = {}
        a.forEach(([k, v]) => {
          res[k] = v
        })
        return res
      })
    )
}

export function accessServiceMF<F extends HKT.URIS, C extends HKT.V<"R", "-">>(
  F: Monad<F, C> & Access<F, C>
): <Service>(
  H: Augmented<Service>
) => <N extends string, K, SI, SO, X, I, S, R, E, A>(
  f: (
    _: Service
  ) => HKT.Kind<
    F,
    C,
    HKT.OrFix<"N", C, N>,
    HKT.OrFix<"K", C, K>,
    SI,
    SO,
    HKT.OrFix<"X", C, X>,
    HKT.OrFix<"I", C, I>,
    HKT.OrFix<"S", C, S>,
    HKT.OrFix<"R", C, R>,
    HKT.OrFix<"E", C, E>,
    A
  >
) => HKT.Kind<
  F,
  C,
  HKT.OrFix<"N", C, N>,
  HKT.OrFix<"K", C, K>,
  SI,
  SO,
  HKT.OrFix<"X", C, X>,
  HKT.OrFix<"I", C, I>,
  HKT.OrFix<"S", C, S>,
  HKT.OrFix<"R", C, R & Has<Service>>,
  HKT.OrFix<"E", C, E>,
  A
>
export function accessServiceMF(
  F: Monad<[HKT.UF___], HKT.V<"R", "-">> & Access<[HKT.UF___], HKT.V<"R", "-">>
): <Service>(
  H: Augmented<Service>
) => <R, E, A>(
  f: (_: Service) => HKT.F___<R, E, A>
) => HKT.F___<Has<Service> & R, E, A> {
  return (H) => (f) => accessMF(F)(flow(H.read, f))
}

export function provideServiceF<F extends HKT.URIS, C extends HKT.V<"R", "-">>(
  F: Monad<F, C> & Access<F, C> & Provide<F, C>
): <Service>(
  H: Augmented<Service>
) => (
  S: Service
) => <N extends string, K, SI, SO, X, I, S, R, E, A>(
  fa: HKT.Kind<
    F,
    C,
    HKT.OrFix<"N", C, N>,
    HKT.OrFix<"K", C, K>,
    SI,
    SO,
    HKT.OrFix<"X", C, X>,
    HKT.OrFix<"I", C, I>,
    HKT.OrFix<"S", C, S>,
    HKT.OrFix<"R", C, R & Has<Service>>,
    HKT.OrFix<"E", C, E>,
    A
  >
) => HKT.Kind<
  F,
  C,
  HKT.OrFix<"N", C, N>,
  HKT.OrFix<"K", C, K>,
  SI,
  SO,
  HKT.OrFix<"X", C, X>,
  HKT.OrFix<"I", C, I>,
  HKT.OrFix<"S", C, S>,
  HKT.OrFix<"R", C, R>,
  HKT.OrFix<"E", C, E>,
  A
>
export function provideServiceF(
  F: Monad<[HKT.UF___], HKT.V<"R", "-">> &
    Access<[HKT.UF___], HKT.V<"R", "-">> &
    Provide<[HKT.UF___], HKT.V<"R", "-">>
) {
  return <Service>(H: Augmented<Service>) => <R, E, A>(S: Service) => (
    fa: HKT.F___<Has<Service> & R, E, A>
  ): HKT.F___<R, E, A> =>
    accessMF(F)((r: R) =>
      pipe(fa, F.provide(({ ...r, [H[HasURI].key]: S } as unknown) as R & Has<Service>))
    )
}

export function provideSomeF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Access<F, C> & Provide<F, C>
): <R, R0>(
  f: (_: HKT.OrFix<"R", C, R0>) => HKT.OrFix<"R", C, R>
) => <N extends string, K, SI, SO, X, I, S, E, A>(
  fa: HKT.Kind<
    F,
    C,
    HKT.OrFix<"N", C, N>,
    HKT.OrFix<"K", C, K>,
    SI,
    SO,
    HKT.OrFix<"X", C, X>,
    HKT.OrFix<"I", C, I>,
    HKT.OrFix<"S", C, S>,
    HKT.OrFix<"R", C, R>,
    HKT.OrFix<"E", C, E>,
    A
  >
) => HKT.Kind<
  F,
  C,
  HKT.OrFix<"N", C, N>,
  HKT.OrFix<"K", C, K>,
  SI,
  SO,
  HKT.OrFix<"X", C, X>,
  HKT.OrFix<"I", C, I>,
  HKT.OrFix<"S", C, S>,
  HKT.OrFix<"R", C, R0>,
  HKT.OrFix<"E", C, E>,
  A
>
export function provideSomeF(
  F: Monad<[HKT.UF___]> & Access<[HKT.UF___]> & Provide<[HKT.UF___]>
) {
  return <R0, R, E, A>(f: (r0: R0) => R) => (
    fa: HKT.F___<R, E, A>
  ): HKT.F___<R0, E, A> => accessMF(F)((r0: R0) => pipe(fa, F.provide(f(r0))))
}
