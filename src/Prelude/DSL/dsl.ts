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
): <
  N extends string,
  K,
  SI,
  SO,
  A,
  X = HKT.Initial<C, "X">,
  I = HKT.Initial<C, "I">,
  S = HKT.Initial<C, "S">,
  R = HKT.Initial<C, "R">,
  E = HKT.Initial<C, "E">
>(
  a: A
) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
export function succeedF(
  F: Any<[HKT.UF_]> & Covariant<[HKT.UF_]>
): <A>(a: A) => HKT.F_<A> {
  return <A>(a: A) => F.map(constant(a))(F.any())
}

export function chainF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <N2 extends string, K2, SO, SO2, X2, I2, S2, R2, E2, A, B>(
  f: (a: A) => HKT.Kind<F, C, N2, K2, SO, SO2, X2, I2, S2, R2, E2, B>
) => <N extends string, K, SI, X, I, S, R, E>(
  fa: HKT.Kind<
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
) => HKT.Kind<
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
  X = HKT.Initial<C, "X">,
  I = HKT.Initial<C, "I">,
  S = HKT.Initial<C, "S">,
  R = HKT.Initial<C, "R">,
  R2 = HKT.Initial<C, "R">,
  E = HKT.Initial<C, "E">
>(
  f: (r: HKT.OrFix<"R", C, R2>) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R & R2, E, A>
export function accessMF(
  F: Access<[HKT.UF___]> & AssociativeFlatten<[HKT.UF___]>
): <R, E, A>(f: (r: R) => HKT.F___<R, E, A>) => HKT.F___<R, E, A> {
  return flow(F.access, F.flatten)
}

export function sequenceSF<F extends HKT.URIS, C = HKT.Auto>(
  F: Applicative<F, C>
): <
  SIO,
  NER extends Record<
    string,
    HKT.Kind<
      F,
      C,
      any,
      any,
      SIO,
      SIO,
      HKT.Intro<C, "X", X, any>,
      HKT.Intro<C, "I", I, any>,
      HKT.Intro<C, "S", S, any>,
      HKT.Intro<C, "R", R, any>,
      HKT.Intro<C, "E", E, any>,
      unknown
    >
  >,
  X = HKT.Initial<C, "X">,
  I = HKT.Initial<C, "I">,
  S = HKT.Initial<C, "S">,
  R = HKT.Initial<C, "R">,
  E = HKT.Initial<C, "E">
>(
  r: EnforceNonEmptyRecord<NER> &
    Record<
      string,
      HKT.Kind<
        F,
        C,
        any,
        any,
        SIO,
        SIO,
        HKT.Intro<C, "X", X, any>,
        HKT.Intro<C, "I", I, any>,
        HKT.Intro<C, "S", S, any>,
        HKT.Intro<C, "R", R, any>,
        HKT.Intro<C, "E", E, any>,
        unknown
      >
    >
) => HKT.Kind<
  F,
  C,
  {
    [K in keyof NER]: HKT.InferN<F, NER[K]>
  }[keyof NER],
  {
    [K in keyof NER]: HKT.InferK<F, NER[K]>
  }[keyof NER],
  SIO,
  SIO,
  HKT.MixStruct<
    C,
    "X",
    X,
    {
      [K in keyof NER]: HKT.InferX<F, NER[K]>
    }
  >,
  HKT.MixStruct<
    C,
    "I",
    I,
    {
      [K in keyof NER]: HKT.InferI<F, NER[K]>
    }
  >,
  HKT.MixStruct<
    C,
    "S",
    S,
    {
      [K in keyof NER]: HKT.InferS<F, NER[K]>
    }
  >,
  HKT.MixStruct<
    C,
    "R",
    R,
    {
      [K in keyof NER]: HKT.InferR<F, NER[K]>
    }
  >,
  HKT.MixStruct<
    C,
    "E",
    E,
    {
      [K in keyof NER]: HKT.InferE<F, NER[K]>
    }
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
  f: (_: Service) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R & Has<Service>, E, A>
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
  fa: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R & Has<Service>, E, A>
) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
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
): <
  X = HKT.Initial<C, "X">,
  I = HKT.Initial<C, "I">,
  S = HKT.Initial<C, "S">,
  R = HKT.Initial<C, "R">,
  E = HKT.Initial<C, "E">,
  R2 = HKT.Initial<C, "R">
>(
  f: (_: HKT.OrFix<"R", C, R2>) => HKT.OrFix<"R", C, R>
) => <N extends string, K, SI, SO, A>(
  fa: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R2, E, A>
export function provideSomeF(
  F: Monad<[HKT.UF___]> & Access<[HKT.UF___]> & Provide<[HKT.UF___]>
) {
  return <R0, R, E, A>(f: (r0: R0) => R) => (
    fa: HKT.F___<R, E, A>
  ): HKT.F___<R0, E, A> => accessMF(F)((r0: R0) => pipe(fa, F.provide(f(r0))))
}

export function doF<F extends HKT.URIS, C = HKT.Auto>(
  F: Any<F, C> & Covariant<F, C>
): <
  N extends string,
  K,
  SI,
  SO,
  A,
  X = HKT.Initial<C, "X">,
  I = HKT.Initial<C, "I">,
  S = HKT.Initial<C, "S">,
  R = HKT.Initial<C, "R">,
  E = HKT.Initial<C, "E">
>() => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, {}>
export function doF(F: Any<[HKT.UF_]> & Covariant<[HKT.UF_]>): () => HKT.F_<{}> {
  return () => succeedF(F)({})
}

export function bindF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <N2 extends string, K2, SO, SO2, X2, I2, S2, R2, E2, BK, BN extends string, BA>(
  tag: Exclude<BN, keyof BK>,
  f: (a: BA) => HKT.Kind<F, C, N2, K2, SO, SO2, X2, I2, S2, R2, E2, BA>
) => <N extends string, K, SI, X, I, S, R, E>(
  fa: HKT.Kind<
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
    BK
  >
) => HKT.Kind<
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
  BK & { [k in BN]: BA }
>
export function bindF(
  F: Monad<[HKT.UF_]>
): <A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => HKT.F_<A>
) => (mk: HKT.F_<K>) => HKT.F_<K & { [k in N]: A }> {
  return <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => HKT.F_<A>) => (
    mk: HKT.F_<K>
  ): HKT.F_<K & { [k in N]: A }> =>
    pipe(
      mk,
      chainF(F)((k) =>
        pipe(
          f(k),
          F.map((a) =>
            Object.assign({}, k, { [tag]: a } as {
              [k in N]: A
            })
          )
        )
      )
    )
}
