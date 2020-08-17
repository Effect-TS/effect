import { Either } from "../../Either"
import { identity } from "../../Function"
import { Separated } from "../../_system/Utils"
import { ApplicativeF, ApplicativeK } from "../Applicative"
import { HasURI, HKTFull, HKT_, KeyFor, KindFull, URIS } from "../HKT"

export interface WiltWithKeysF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeF<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    FK,
    FNK extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B,
    C
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK>
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
      Either<B, C>
    >
  ) => (
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
    Separated<
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >

  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    FK,
    FNK extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B,
    C
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK>
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
      Either<B, C>
    >
  ) => (
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
    Separated<
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >
}

export interface WiltableWithKeysF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly separateWithKeysF: WiltWithKeysF<F, TL0, TL1, TL2, TL3>
}

export interface WiltWithKeysK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeF<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    FK,
    FNK extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B,
    C
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK>
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
      Either<B, C>
    >
  ) => (
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
    Separated<
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >

  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    FK,
    FNK extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B,
    C
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK>
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
      Either<B, C>
    >
  ) => (
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
    Separated<
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >
}

export interface WiltableWithKeysK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly separateWithKeysF: WiltWithKeysK<F, TL0, TL1, TL2, TL3>
}

export function implementSeparateWithKeysF<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(): (
  i: <A, B, C, FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr, G>(_: {
    G: G
    A: A
    B: B
    C: C
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
    f: (a: A, k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK>) => HKT_<G, Either<B, C>>
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT_<
    G,
    Separated<
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >
) => WiltWithKeysK<F, TL0, TL1, TL2, TL3>
export function implementSeparateWithKeysF() {
  return identity as any
}
