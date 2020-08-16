import { Option } from "../../Option"
import { ApplicativeF, ApplicativeK, ApplicativeKE } from "../Applicative"
import { HasURI, HKTFull, KindFull, URIS } from "../HKT"

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

  <G extends URIS, GErr, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeKE<G, GErr, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, A, B>(
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

  <G extends URIS, GErr, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, A, B>(
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

export interface WitherKE<
  F extends URIS,
  FErr,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> {
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
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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

  <G extends URIS, GErr, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, A, B>(
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
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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

export interface WitherableKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly compactF: WitherKE<F, E, TL0, TL1, TL2, TL3>
}

export function makeWitherable<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WitherableKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => WitherableKE<URI, E, TL0, TL1, TL2, TL3>
export function makeWitherable<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<WitherableK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => WitherableK<URI, TL0, TL1, TL2, TL3>
export function makeWitherable<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<WitherableF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => WitherableF<URI, TL0, TL1, TL2, TL3>
export function makeWitherable<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<WitherableF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => WitherableF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}

export function implementCompactF<F extends URIS, E>(): <
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
) => WitherK<F, TL0, TL1, TL2, TL3>
export function implementCompactF<F extends URIS>(): <
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
) => WitherK<F, TL0, TL1, TL2, TL3>
export function implementCompactF() {
  return () => (i: any) => i()
}
