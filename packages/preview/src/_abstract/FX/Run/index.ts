import { Either } from "../../../_system/Either"
import { HasE, HasURI, HKTTL, KindTL, URIS } from "../../HKT"

export interface RunF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly run: <K, KN extends string, SI, SO, X, I, S, R, E, A>(
    fa: HKTTL<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => HKTTL<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, never, Either<E, A>>
}

export interface RunK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly run: <K, KN extends string, SI, SO, X, I, S, R, E, A>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => KindTL<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, never, Either<E, A>>
}

export interface RunKE<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3>,
    HasE<E> {
  readonly run: <K, KN extends string, SI, SO, X, I, S, R, A>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => KindTL<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, never, Either<E, A>>
}

export function makeRun<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    RunKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => RunKE<URI, E, TL0, TL1, TL2, TL3>
export function makeRun<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<RunK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => RunK<URI, TL0, TL1, TL2, TL3>
export function makeRun<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<RunF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => RunF<URI, TL0, TL1, TL2, TL3>
export function makeRun<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<RunF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => RunF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    Run: "Run",
    ..._
  })
}
