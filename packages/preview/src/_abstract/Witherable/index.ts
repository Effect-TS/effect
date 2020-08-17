import { identity } from "../../Function"
import { Option } from "../../Option"
import { ApplicativeF, ApplicativeK } from "../Applicative"
import { HasURI, HKTFull, HKT_, KindFull, URIS } from "../HKT"

export interface WitherF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeF<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B>(
    f: (
      a: A
    ) => HKTFull<
      G,
      GTL0,
      GTL1,
      GTL2,
      GTL3,
      GK,
      GNK,
      GSIO,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      Option<B>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    ta: HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKTFull<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GNK,
    GSIO,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >

  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B>(
    f: (
      a: A
    ) => KindFull<
      G,
      GTL0,
      GTL1,
      GTL2,
      GTL3,
      GK,
      GNK,
      GSIO,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      Option<B>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    ta: HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => KindFull<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GNK,
    GSIO,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface WitherableF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly compactF: WitherF<F, TL0, TL1, TL2, TL3>
}

export interface WitherK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeF<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B>(
    f: (
      a: A
    ) => HKTFull<
      G,
      GTL0,
      GTL1,
      GTL2,
      GTL3,
      GK,
      GNK,
      GSIO,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      Option<B>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKTFull<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GNK,
    GSIO,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >

  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B>(
    f: (
      a: A
    ) => KindFull<
      G,
      GTL0,
      GTL1,
      GTL2,
      GTL3,
      GK,
      GNK,
      GSIO,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      Option<B>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => KindFull<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GNK,
    GSIO,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface WitherableK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly compactF: WitherK<F, TL0, TL1, TL2, TL3>
}

export function implementCompactF<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(): (
  i: <A, B, FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr, G>(_: {
    G: G
    A: A
    B: B
    FK: FK
    FNK: FNK
    FSI: FSI
    FSO: FSO
    FX: FX
    FIn: FIn
    FSt: FSt
    FEnv: FEnv
    FErr: FErr
  }) => (
    G: ApplicativeF<G>
  ) => (
    f: (a: A) => HKT_<G, Option<B>>
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT_<
    G,
    KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
) => WitherK<F, TL0, TL1, TL2, TL3>
export function implementCompactF() {
  return identity as any
}
