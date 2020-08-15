import { CovariantF, CovariantK, CovariantKE } from "../Covariant"
import { HKTTL, KeyFor, KindTL, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK, IdentityBothKE } from "../IdentityBoth"

export interface ForeachWithKeysF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GKN extends string,
    GX,
    GI,
    GSIO,
    GS,
    GR,
    GE,
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
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => (
    fa: HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GSIO,
    GKN extends string,
    X,
    In,
    S,
    Env,
    Err,
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
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, X, In, S, Env, Err, B>
  ) => (
    fa: HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    X,
    In,
    S,
    Env,
    Err,
    HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GE, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothKE<G, GE, GTL0, GTL1, GTL2, GTL3> &
      CovariantKE<G, GE, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GSIO,
    GKN extends string,
    X,
    In,
    S,
    Env,
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
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, X, In, S, Env, GE, B>
  ) => (
    fa: HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    X,
    In,
    S,
    Env,
    GE,
    HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends CovariantF<F, TL0, TL1, TL2, TL3> {
  readonly foreachWithKeysF: ForeachWithKeysF<F, TL0, TL1, TL2, TL3>
}

export interface ForeachWithKeysK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GKN extends string,
    GX,
    GI,
    GSIO,
    GS,
    GR,
    GE,
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
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => (
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GSIO,
    GKN extends string,
    X,
    In,
    S,
    Env,
    Err,
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
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, X, In, S, Env, Err, B>
  ) => (
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    X,
    In,
    S,
    Env,
    Err,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GE, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothKE<G, GE, GTL0, GTL1, GTL2, GTL3> &
      CovariantKE<G, GE, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GSIO,
    GKN extends string,
    X,
    In,
    S,
    Env,
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
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, X, In, S, Env, GE, B>
  ) => (
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    X,
    In,
    S,
    Env,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends CovariantK<F, TL0, TL1, TL2, TL3> {
  readonly TraversableWithKeys: "TraversableWithKeys"
  readonly foreachWithKeysF: ForeachWithKeysK<F, TL0, TL1, TL2, TL3>
}

export interface ForeachWithKeysKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GKN extends string,
    GX,
    GI,
    GSIO,
    GS,
    GR,
    GE,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => (
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GSIO,
    GKN extends string,
    X,
    In,
    S,
    Env,
    Err,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, X, In, S, Env, Err, B>
  ) => (
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    X,
    In,
    S,
    Env,
    Err,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G extends URIS, GE, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothKE<G, GE, GTL0, GTL1, GTL2, GTL3> &
      CovariantKE<G, GE, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GSIO,
    GKN extends string,
    X,
    In,
    S,
    Env,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, X, In, S, Env, GE, B>
  ) => (
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    X,
    In,
    S,
    Env,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
}

export interface TraversableWithKeysKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends CovariantKE<F, TL0, TL1, TL2, TL3> {
  readonly TraversableWithKeys: "TraversableWithKeys"
  readonly foreachWithKeysF: ForeachWithKeysKE<F, E, TL0, TL1, TL2, TL3>
}

export function makeTraversableWithKeys<
  URI extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  C: CovariantKE<URI, E, TL0, TL1, TL2, TL3>
): (
  _: Omit<
    TraversableWithKeysKE<URI, E, TL0, TL1, TL2, TL3>,
    | "URI"
    | "TL0"
    | "TL1"
    | "TL2"
    | "TL3"
    | "TraversableWithKeys"
    | keyof CovariantKE<URI, E, TL0, TL1, TL2, TL3>
  >
) => TraversableWithKeysKE<URI, E, TL0, TL1, TL2, TL3>
export function makeTraversableWithKeys<
  URI extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  C: CovariantK<URI, TL0, TL1, TL2, TL3>
): (
  _: Omit<
    TraversableWithKeysK<URI, TL0, TL1, TL2, TL3>,
    | "URI"
    | "TL0"
    | "TL1"
    | "TL2"
    | "TL3"
    | "TraversableWithKeys"
    | keyof CovariantK<URI, TL0, TL1, TL2, TL3>
  >
) => TraversableWithKeysK<URI, TL0, TL1, TL2, TL3>
export function makeTraversableWithKeys<
  URI,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  C: CovariantF<URI, TL0, TL1, TL2, TL3>
): (
  _: Omit<
    TraversableWithKeysF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | keyof CovariantF<URI, TL0, TL1, TL2, TL3>
  >
) => TraversableWithKeysF<URI, TL0, TL1, TL2, TL3>
export function makeTraversableWithKeys<
  URI,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  C: CovariantF<URI, TL0, TL1, TL2, TL3>
): (
  _: Omit<
    TraversableWithKeysF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => TraversableWithKeysF<URI, TL0, TL1, TL2, TL3> {
  return (_) => ({
    ..._,
    ...C
  })
}

export function implementForeachWithKeysF<F extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  i: <
    FK,
    FKN extends string,
    A,
    G,
    GSIO,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
    GE,
    B,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv
  >(_: {
    _g: G
    _b: B
    _ge: GE
    _gi: GI
    _gs: GS
    _gr: GR
    _gx: GX
    _a: A
    _fkn: FKN
    _fk: FK
  }) => (
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ) => (
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => (
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
) => ForeachWithKeysKE<F, E, TL0, TL1, TL2, TL3>
export function implementForeachWithKeysF<F extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  i: <
    FErr,
    FK,
    FKN extends string,
    A,
    G,
    GSIO,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
    GE,
    B,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv
  >(_: {
    _g: G
    _b: B
    _ge: GE
    _gi: GI
    _gs: GS
    _gr: GR
    _gx: GX
    _ferr: FErr
    _a: A
    _fkn: FKN
    _fk: FK
  }) => (
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ) => (
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => (
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
) => ForeachWithKeysK<F, TL0, TL1, TL2, TL3>
export function implementForeachWithKeysF() {
  return () => (i: any) => i()
}
