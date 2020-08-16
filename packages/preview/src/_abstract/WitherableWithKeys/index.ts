import { Option } from "../../Option"
import { ApplicativeF, ApplicativeK } from "../Applicative"
import { HasURI, HKTFull, KeyFor, KindFull, URIS } from "../HKT"

export interface WitherWithKeysF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
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
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
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
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >

  <G extends URIS, GErr, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface WitherableWithKeysF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly compactWithKeysF: WitherWithKeysF<F, TL0, TL1, TL2, TL3>
}

export interface WitherWithKeysK<
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
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
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
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >

  <G extends URIS, GErr, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr,
    A,
    B
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface WitherableWithKeysK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly compactWithKeysF: WitherWithKeysK<F, TL0, TL1, TL2, TL3>
}

export interface WitherWithKeysKE<
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
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    A,
    B
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
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
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    A,
    B
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >

  <G extends URIS, GErr, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GNK extends string,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    A,
    B
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface WitherableWithKeysKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly compactWithKeysF: WitherWithKeysKE<F, E, TL0, TL1, TL2, TL3>
}

export function makeWitherableWithKeys<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WitherableWithKeysKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "WitherableWithKeys" | "_E"
  >
) => WitherableWithKeysKE<URI, E, TL0, TL1, TL2, TL3>
export function makeWitherableWithKeys<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WitherableWithKeysK<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "WitherableWithKeys"
  >
) => WitherableWithKeysK<URI, TL0, TL1, TL2, TL3>
export function makeWitherableWithKeys<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WitherableWithKeysF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "WitherableWithKeys"
  >
) => WitherableWithKeysF<URI, TL0, TL1, TL2, TL3>
export function makeWitherableWithKeys<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WitherableWithKeysF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "WitherableWithKeys"
  >
) => WitherableWithKeysF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    WitherableWithKeys: "WitherableWithKeys",
    ..._
  })
}

export function implemenCompactWithKeysF<F extends URIS, E>(): <
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
    FK,
    FKN extends string,
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
    FK: FK
    FKN: FKN
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
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
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
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
) => WitherWithKeysK<F, TL0, TL1, TL2, TL3>
export function implemenCompactWithKeysF<F extends URIS>(): <
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
    FK,
    FKN extends string,
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
    FK: FK
    FKN: FKN
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
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
  ) => (
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
) => WitherWithKeysK<F, TL0, TL1, TL2, TL3>
export function implemenCompactWithKeysF() {
  return () => (i: any) => i()
}
