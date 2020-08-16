import { Either } from "../../Either"
import { Separated } from "../../_system/Utils"
import { ApplicativeF, ApplicativeK, ApplicativeKE } from "../Applicative"
import { HasE, HasURI, HKTFull, KindFull, URIS } from "../HKT"

export interface WiltF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeF<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
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
      Either<B, C>
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
    Separated<
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >

  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
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
      Either<B, C>
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
    Separated<
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >

  <G extends URIS, GE, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeKE<G, GE, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, A, B, C>(
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
      GE,
      Either<B, C>
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
    GE,
    Separated<
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      HKTFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >
}

export interface WiltableF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly separateF: WiltF<F, TL0, TL1, TL2, TL3>
}

export interface WiltK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeF<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
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
      Either<B, C>
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
    Separated<
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >

  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
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
      Either<B, C>
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
    Separated<
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >

  <G extends URIS, GE, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeKE<G, GE, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, A, B, C>(
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
      GE,
      Either<B, C>
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
    GE,
    Separated<
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >
}

export interface WiltableK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly separateF: WiltK<F, TL0, TL1, TL2, TL3>
}

export interface WiltKE<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeF<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
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
      Either<B, C>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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

  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
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
      Either<B, C>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
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
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, B>,
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, C>
    >
  >

  <G extends URIS, GE, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    F: ApplicativeKE<G, GE, GTL0, GTL1, GTL2, GTL3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, A, B, C>(
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
      GE,
      Either<B, C>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
    ta: KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
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
    GE,
    Separated<
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, B>,
      KindFull<F, TL0, TL1, TL2, TL3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, E, C>
    >
  >
}

export interface WiltableK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly separateF: WiltK<F, TL0, TL1, TL2, TL3>
}

export interface WiltableKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3>, HasE<E> {
  readonly separateF: WiltKE<F, E, TL0, TL1, TL2, TL3>
}

export function makeWiltable<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    WiltableKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => WiltableKE<URI, E, TL0, TL1, TL2, TL3>
export function makeWiltable<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<WiltableK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => WiltableK<URI, TL0, TL1, TL2, TL3>
export function makeWiltable<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<WiltableF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => WiltableF<URI, TL0, TL1, TL2, TL3>
export function makeWiltable<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<WiltableF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => WiltableF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}

export function implementSeparateF<F extends URIS, E>(): <
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
) => WiltKE<F, E, TL0, TL1, TL2, TL3>
export function implementSeparateF<F extends URIS>(): <
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
) => WiltK<F, TL0, TL1, TL2, TL3>
export function implementSeparateF() {
  return () => (i: any) => i() as any
}
