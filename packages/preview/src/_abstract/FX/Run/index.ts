import { Either } from "../../../_system/Either"
import { ErrFor, HasURI, HKTFix, KindFix, URIS } from "../../HKT"

export interface RunF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly run: <K, KN extends string, SI, SO, X, I, S, R, E, A>(
    fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => HKTFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    K,
    KN,
    SI,
    SO,
    X,
    I,
    S,
    R,
    never,
    Either<ErrFor<F, Fix0, Fix1, Fix2, Fix3, E>, A>
  >
}

export interface RunK<F extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly run: <K, KN extends string, SI, SO, X, I, S, R, E, A>(
    fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => KindFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    K,
    KN,
    SI,
    SO,
    X,
    I,
    S,
    R,
    never,
    Either<ErrFor<F, Fix0, Fix1, Fix2, Fix3, E>, A>
  >
}

export function makeRun<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<RunK<URI, Fix0, Fix1, Fix2, Fix3>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3">
) => RunK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeRun<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<RunF<URI, Fix0, Fix1, Fix2, Fix3>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3">
) => RunF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeRun<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<RunF<URI, Fix0, Fix1, Fix2, Fix3>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3">
) => RunF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    Run: "Run",
    ..._
  })
}
