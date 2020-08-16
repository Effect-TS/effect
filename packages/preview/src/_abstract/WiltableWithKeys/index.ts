import { Either } from "../../Either"
import { Separated } from "../../_system/Utils"
import { ApplicativeF, ApplicativeK, ApplicativeKE } from "../Applicative"
import { HasURI, HKTFull, KeyFor, KindFull, URIS } from "../HKT"

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
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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

  <G extends URIS, GErr, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeKE<G, GErr, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
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
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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

  <G extends URIS, GErr, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeKE<G, GErr, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
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
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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

export interface WiltWithKeysKE<
  F extends URIS,
  FErr,
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
    A,
    B,
    C
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    A,
    B,
    C
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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

  <G extends URIS, GErr, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeKE<G, GErr, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    FK,
    FNK extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    A,
    B,
    C
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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

export interface WiltableWithKeysKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly separateWithKeysF: WiltWithKeysKE<F, E, TL0, TL1, TL2, TL3>
}

export function makeWiltableWithKeys<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WiltableWithKeysKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => WiltableWithKeysKE<URI, E, TL0, TL1, TL2, TL3>
export function makeWiltableWithKeys<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WiltableWithKeysK<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => WiltableWithKeysK<URI, TL0, TL1, TL2, TL3>
export function makeWiltableWithKeys<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WiltableWithKeysF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => WiltableWithKeysF<URI, TL0, TL1, TL2, TL3>
export function makeWiltableWithKeys<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WiltableWithKeysF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => WiltableWithKeysF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}

export function implementSeparateWithKeysF<F extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  i: <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    A,
    B,
    C,
    FK,
    FNK extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    G,
    GTL0 = any,
    GTL1 = any,
    GTL2 = any,
    GTL3 = any
  >(_: {
    G: G
    GK: GK
    GNK: GNK
    GSIO: GSIO
    GX: GX
    GIn: GIn
    GSt: GSt
    GEnv: GEnv
    GErr: GErr
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
  }) => (
    G: ApplicativeF<G, GTL0, GTL1, GTL2, GTL3>
  ) => (
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
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
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
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
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, B>,
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, C>
    >
  >
) => WiltWithKeysK<F, TL0, TL1, TL2, TL3>
export function implementSeparateWithKeysF<F extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  i: <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    A,
    B,
    C,
    FK,
    FNK extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    G,
    GTL0 = any,
    GTL1 = any,
    GTL2 = any,
    GTL3 = any
  >(_: {
    G: G
    GK: GK
    GNK: GNK
    GSIO: GSIO
    GX: GX
    GIn: GIn
    GSt: GSt
    GEnv: GEnv
    GErr: GErr
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
    G: ApplicativeF<G, GTL0, GTL1, GTL2, GTL3>
  ) => (
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
) => WiltWithKeysK<F, TL0, TL1, TL2, TL3>
export function implementSeparateWithKeysF() {
  return () => (i: any) => i()
}
