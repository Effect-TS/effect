import * as A from "@effect-ts/system/Array"

import type { Has, Tag } from "../../Classic/Has"
import { constant, flow, pipe, tuple } from "../../Function"
import type { EnforceNonEmptyRecord } from "../../Utils"
import type { Any } from "../Any"
import type { Applicative } from "../Applicative"
import type { AssociativeFlatten } from "../AssociativeFlatten"
import type { Covariant } from "../Covariant"
import type { Access, Provide } from "../FX"
import type * as HKT from "../HKT"
import type { Monad } from "../Monad"

export function succeedF<F extends HKT.URIS, C = HKT.Auto>(
  F: Any<F, C> & Covariant<F, C>
): <
  A,
  N extends string = HKT.Initial<C, "N">,
  K = HKT.Initial<C, "K">,
  Q = HKT.Initial<C, "Q">,
  W = HKT.Initial<C, "W">,
  X = HKT.Initial<C, "X">,
  I = HKT.Initial<C, "I">,
  S = HKT.Initial<C, "S">,
  R = HKT.Initial<C, "R">,
  E = HKT.Initial<C, "E">
>(
  a: A
) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
export function succeedF<F>(
  F: Any<HKT.UHKT<F>> & Covariant<HKT.UHKT<F>>
): <A>(a: A) => HKT.HKT<F, A> {
  return <A>(a: A) => F.map(constant(a))(F.any())
}

export function chainF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2, A, B>(
  f: (a: A) => HKT.Kind<F, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
) => <N extends string, K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<
    F,
    C,
    HKT.Intro<C, "N", N2, N>,
    HKT.Intro<C, "K", K2, K>,
    HKT.Intro<C, "Q", Q2, Q>,
    HKT.Intro<C, "W", W2, W>,
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
  HKT.Mix<C, "N", [N2, N]>,
  HKT.Mix<C, "K", [K2, K]>,
  HKT.Mix<C, "Q", [Q2, Q]>,
  HKT.Mix<C, "W", [W2, W]>,
  HKT.Mix<C, "X", [X2, X]>,
  HKT.Mix<C, "I", [I2, I]>,
  HKT.Mix<C, "S", [S2, S]>,
  HKT.Mix<C, "R", [R2, R]>,
  HKT.Mix<C, "X", [E2, E]>,
  B
>
export function chainF<F>(F: Monad<HKT.UHKT<F>>) {
  return <A, B>(f: (a: A) => HKT.HKT<F, B>) => flow(F.map(f), F.flatten)
}

export function accessMF<F extends HKT.URIS, C = HKT.Auto>(
  F: Access<F, C> & AssociativeFlatten<F, C>
): <N extends string, K, Q, W, X, I, S, R, R2, E, A>(
  f: (r: HKT.OrFix<"R", C, R2>) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R & R2, E, A>
export function accessMF<F>(
  F: Access<HKT.UHKT3<F>> & AssociativeFlatten<HKT.UHKT3<F>>
): <R, E, A>(f: (r: R) => HKT.HKT3<F, R, E, A>) => HKT.HKT3<F, R, E, A> {
  return flow(F.access, F.flatten)
}

type SMix<F extends HKT.URIS, C, NER, P extends HKT.Param, AS> = HKT.MixStruct<
  C,
  P,
  AS,
  {
    [K in keyof NER]: HKT.Infer<F, P, NER[K]>
  }
>

export function structF<F extends HKT.URIS, C = HKT.Auto>(
  F: Applicative<F, C>
): <
  NER extends Record<
    string,
    HKT.Kind<
      F,
      C,
      HKT.Intro<C, "N", N, any>,
      HKT.Intro<C, "K", K, any>,
      HKT.Intro<C, "Q", Q, any>,
      HKT.Intro<C, "W", W, any>,
      HKT.Intro<C, "X", X, any>,
      HKT.Intro<C, "I", I, any>,
      HKT.Intro<C, "S", S, any>,
      HKT.Intro<C, "R", R, any>,
      HKT.Intro<C, "E", E, any>,
      unknown
    >
  >,
  N extends string = HKT.Initial<C, "N">,
  K = HKT.Initial<C, "K">,
  Q = HKT.Initial<C, "Q">,
  W = HKT.Initial<C, "W">,
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
        HKT.Intro<C, "N", N, any>,
        HKT.Intro<C, "K", K, any>,
        HKT.Intro<C, "Q", Q, any>,
        HKT.Intro<C, "W", W, any>,
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
  SMix<F, C, NER, "N", N>,
  SMix<F, C, NER, "K", K>,
  SMix<F, C, NER, "Q", Q>,
  SMix<F, C, NER, "W", W>,
  SMix<F, C, NER, "X", X>,
  SMix<F, C, NER, "I", I>,
  SMix<F, C, NER, "S", S>,
  SMix<F, C, NER, "R", R>,
  SMix<F, C, NER, "E", E>,
  {
    [K in keyof NER]: HKT.Infer<F, "A", NER[K]>
  }
>
export function structF<F>(
  F: Applicative<HKT.UHKT<F>>
): (r: Record<string, HKT.HKT<F, any>>) => HKT.HKT<F, Record<string, any>> {
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
  H: Tag<Service>
) => <N extends string, K, Q, W, X, I, S, R, E, A>(
  f: (_: Service) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R & Has<Service>, E, A>
export function accessServiceMF<F>(
  F: Monad<HKT.UHKT3<F>, HKT.V<"R", "-">> & Access<HKT.UHKT3<F>, HKT.V<"R", "-">>
): <Service>(
  H: Tag<Service>
) => <R, E, A>(
  f: (_: Service) => HKT.HKT3<F, R, E, A>
) => HKT.HKT3<F, Has<Service> & R, E, A> {
  return (H) => (f) => accessMF(F)(flow(H.read, f))
}

export function provideServiceF<F extends HKT.URIS, C extends HKT.V<"R", "-">>(
  F: Monad<F, C> & Access<F, C> & Provide<F, C>
): <Service>(
  H: Tag<Service>
) => (
  S: Service
) => <N extends string, K, Q, W, X, I, S, R, E, A>(
  fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R & Has<Service>, E, A>
) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
export function provideServiceF<F>(
  F: Monad<HKT.UHKT3<F>, HKT.V<"R", "-">> &
    Access<HKT.UHKT3<F>, HKT.V<"R", "-">> &
    Provide<HKT.UHKT3<F>, HKT.V<"R", "-">>
) {
  return <Service>(H: Tag<Service>) => <R, E, A>(S: Service) => (
    fa: HKT.HKT3<F, Has<Service> & R, E, A>
  ): HKT.HKT3<F, R, E, A> =>
    accessMF(F)((r: R) =>
      pipe(fa, F.provide(({ ...r, [H.key]: S } as unknown) as R & Has<Service>))
    )
}

export function provideSomeF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Access<F, C> & Provide<F, C>
): <R, R2>(
  f: (_: HKT.OrFix<"R", C, R2>) => HKT.OrFix<"R", C, R>
) => <N extends string, K, Q, W, X, I, S, E, A>(
  fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R2, E, A>
export function provideSomeF<F>(
  F: Monad<HKT.UHKT3<F>> & Access<HKT.UHKT3<F>> & Provide<HKT.UHKT3<F>>
) {
  return <R0, R, E, A>(f: (r0: R0) => R) => (
    fa: HKT.HKT3<F, R, E, A>
  ): HKT.HKT3<F, R0, E, A> => accessMF(F)((r0: R0) => pipe(fa, F.provide(f(r0))))
}

export function doF<F extends HKT.URIS, C = HKT.Auto>(
  F: Any<F, C> & Covariant<F, C>
): <
  N extends string = HKT.Initial<C, "N">,
  K = HKT.Initial<C, "K">,
  Q = HKT.Initial<C, "Q">,
  W = HKT.Initial<C, "W">,
  X = HKT.Initial<C, "X">,
  I = HKT.Initial<C, "I">,
  S = HKT.Initial<C, "S">,
  R = HKT.Initial<C, "R">,
  E = HKT.Initial<C, "E">
>() => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, {}>
export function doF<F>(
  F: Any<HKT.UHKT<F>> & Covariant<HKT.UHKT<F>>
): () => HKT.HKT<F, {}> {
  return () => succeedF(F)({})
}

export function bindF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2, BK, BN extends string, BA>(
  tag: Exclude<BN, keyof BK>,
  f: (a: BA) => HKT.Kind<F, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, BA>
) => <N extends string, K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<
    F,
    C,
    HKT.Intro<C, "N", N2, N>,
    HKT.Intro<C, "K", K2, K>,
    HKT.Intro<C, "Q", Q2, Q>,
    HKT.Intro<C, "W", W2, W>,
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
  HKT.Mix<C, "N", [N2, N]>,
  HKT.Mix<C, "K", [K2, K]>,
  HKT.Mix<C, "Q", [Q2, Q]>,
  HKT.Mix<C, "W", [W2, W]>,
  HKT.Mix<C, "X", [X2, X]>,
  HKT.Mix<C, "I", [I2, I]>,
  HKT.Mix<C, "S", [S2, S]>,
  HKT.Mix<C, "R", [R2, R]>,
  HKT.Mix<C, "X", [E2, E]>,
  BK & { [k in BN]: BA }
>
export function bindF<F>(
  F: Monad<HKT.UHKT<F>>
): <A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => HKT.HKT<F, A>
) => (mk: HKT.HKT<F, K>) => HKT.HKT<F, K & { [k in N]: A }> {
  return <A, K, N extends string>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => HKT.HKT<F, A>
  ) => (mk: HKT.HKT<F, K>): HKT.HKT<F, K & { [k in N]: A }> =>
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
