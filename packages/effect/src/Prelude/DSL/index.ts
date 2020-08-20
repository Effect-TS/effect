import { constant, flow, pipe, tuple } from "../../Function"
import { EnforceNonEmptyRecord } from "../../Utils"
import { Any } from "../Any"
import { AssociativeFlatten } from "../AssociativeFlatten"
import { Applicative, Monad } from "../Combined"
import { Covariant } from "../Covariant"
import { Access } from "../FX"
import {
  Auto,
  F_,
  F___,
  InferA,
  InferE,
  InferI,
  InferK,
  InferN,
  InferR,
  InferS,
  InferX,
  Initial,
  Intro,
  Kind,
  Mix,
  MixStruct,
  OrFix,
  UF_,
  UF___,
  URIS
} from "../HKT"

import * as A from "@effect-ts/system/Array"

export function succeedF<F extends URIS, C = Auto>(
  F: Any<F, C> & Covariant<F, C>
): <N extends string, K, SI, SO, X, I, S, R, E, A>(
  a: A
) => Kind<
  F,
  OrFix<"N", C, N>,
  OrFix<"K", C, K>,
  SI,
  SO,
  OrFix<"X", C, Initial<C, "X", X>>,
  OrFix<"I", C, Initial<C, "I", I>>,
  OrFix<"S", C, Initial<C, "S", S>>,
  OrFix<"R", C, Initial<C, "R", R>>,
  OrFix<"E", C, Initial<C, "E", E>>,
  A
>
export function succeedF(F: Any<UF_> & Covariant<UF_>): <A>(a: A) => F_<A> {
  return <A>(a: A) => F.map(constant(a))(F.any())
}

export function chainF<F extends URIS, C = Auto>(
  F: Monad<F, C>
): <N2 extends string, K2, SO, SO2, X2, I2, S2, R2, E2, A, B>(
  f: (
    a: A
  ) => Kind<
    F,
    OrFix<"N", C, N2>,
    OrFix<"K", C, K2>,
    SO,
    SO2,
    OrFix<"X", C, X2>,
    OrFix<"I", C, I2>,
    OrFix<"S", C, S2>,
    OrFix<"R", C, R2>,
    OrFix<"E", C, E2>,
    B
  >
) => <N extends string, K, SI, X, I, S, R, E>(
  fa: Kind<
    F,
    OrFix<"N", C, N>,
    OrFix<"K", C, K>,
    SI,
    SO,
    OrFix<"X", C, Intro<C, "X", X2, X>>,
    OrFix<"I", C, Intro<C, "I", I2, I>>,
    OrFix<"S", C, Intro<C, "S", S2, S>>,
    OrFix<"R", C, Intro<C, "R", R2, R>>,
    OrFix<"E", C, Intro<C, "E", E2, E>>,
    A
  >
) => Kind<
  F,
  OrFix<"N", C, N2>,
  OrFix<"K", C, K2>,
  SI,
  SO2,
  OrFix<"X", C, Mix<C, "X", [X2, X]>>,
  OrFix<"I", C, Mix<C, "I", [I2, I]>>,
  OrFix<"S", C, Mix<C, "S", [S2, S]>>,
  OrFix<"R", C, Mix<C, "R", [R2, R]>>,
  OrFix<"E", C, Mix<C, "X", [E2, E]>>,
  B
>
export function chainF(F: Monad<UF_>) {
  return <A, B>(f: (a: A) => F_<B>) => flow(F.map(f), F.flatten)
}

export function accessMF<F extends URIS, C = Auto>(
  F: Access<F, C> & AssociativeFlatten<F, C>
): <N extends string, K, SI, SO, X, I, S, R, R2, E, A>(
  f: (
    r: OrFix<"R", C, R>
  ) => Kind<
    F,
    OrFix<"N", C, N>,
    OrFix<"K", C, K>,
    SI,
    SO,
    OrFix<"X", C, X>,
    OrFix<"I", C, I>,
    OrFix<"S", C, S>,
    OrFix<"R", C, Intro<C, "R", R, R2>>,
    OrFix<"E", C, E>,
    A
  >
) => Kind<
  F,
  OrFix<"N", C, N>,
  OrFix<"K", C, K>,
  SI,
  SO,
  OrFix<"X", C, X>,
  OrFix<"I", C, I>,
  OrFix<"S", C, S>,
  OrFix<"R", C, Mix<C, "R", [R, R2]>>,
  OrFix<"E", C, E>,
  A
>
export function accessMF(
  F: Access<UF___> & AssociativeFlatten<UF___>
): <R, E, A>(f: (r: R) => F___<R, E, A>) => F___<R, E, A> {
  return flow(F.access, F.flatten)
}

export function sequenceSF<F extends URIS, C = Auto>(
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
    Kind<
      F,
      OrFix<"N", C, any>,
      OrFix<"K", C, any>,
      SIO,
      SIO,
      OrFix<"X", C, Intro<C, "X", X, any>>,
      OrFix<"I", C, Intro<C, "I", I, any>>,
      OrFix<"S", C, Intro<C, "S", S, any>>,
      OrFix<"R", C, Intro<C, "R", R, any>>,
      OrFix<"E", C, Intro<C, "E", E, any>>,
      any
    >
  >
>(
  r: EnforceNonEmptyRecord<NER> &
    Record<
      string,
      Kind<
        F,
        OrFix<"N", C, any>,
        OrFix<"K", C, any>,
        SIO,
        SIO,
        OrFix<"X", C, Intro<C, "X", X, any>>,
        OrFix<"I", C, Intro<C, "I", I, any>>,
        OrFix<"S", C, Intro<C, "S", S, any>>,
        OrFix<"R", C, Intro<C, "R", R, any>>,
        OrFix<"E", C, Intro<C, "E", E, any>>,
        any
      >
    >
) => Kind<
  F,
  OrFix<
    "N",
    C,
    {
      [K in keyof NER]: InferN<F, NER[K]>
    }[keyof NER]
  >,
  OrFix<
    "K",
    C,
    {
      [K in keyof NER]: InferK<F, NER[K]>
    }[keyof NER]
  >,
  SIO,
  SIO,
  OrFix<
    "X",
    C,
    MixStruct<
      C,
      "X",
      X,
      {
        [K in keyof NER]: InferX<F, NER[K]>
      }
    >
  >,
  OrFix<
    "I",
    C,
    MixStruct<
      C,
      "I",
      I,
      {
        [K in keyof NER]: InferI<F, NER[K]>
      }
    >
  >,
  OrFix<
    "S",
    C,
    MixStruct<
      C,
      "S",
      S,
      {
        [K in keyof NER]: InferS<F, NER[K]>
      }
    >
  >,
  OrFix<
    "R",
    C,
    MixStruct<
      C,
      "R",
      R,
      {
        [K in keyof NER]: InferR<F, NER[K]>
      }
    >
  >,
  OrFix<
    "E",
    C,
    MixStruct<
      C,
      "E",
      E,
      {
        [K in keyof NER]: InferE<F, NER[K]>
      }
    >
  >,
  {
    [K in keyof NER]: InferA<F, NER[K]>
  }
>
export function sequenceSF(
  F: Applicative<UF_>
): (r: Record<string, F_<any>>) => F_<Record<string, any>> {
  return (r) =>
    pipe(
      Object.keys(r).map((k) => tuple(k, r[k])),
      A.reduce(succeedF(F)([] as readonly (readonly [string, any])[]), (b, a) =>
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
