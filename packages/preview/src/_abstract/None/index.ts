import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * The identity for combining two values of types `F[A]` and `F[B]`
 */
export interface NoneF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly None: "None"
  readonly none: <S, SI, SO = SI>() => HKTFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    never,
    never,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    never,
    never
  >
}

export interface NoneK<F extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly None: "None"
  readonly none: <S, SI, SO = SI>() => KindFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    never,
    never,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    never,
    never
  >
}

export function makeNone<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    NoneK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "None"
  >
) => NoneK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeNone<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    NoneF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "None"
  >
) => NoneF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeNone<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    NoneF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "None"
  >
) => NoneF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    None: "None",
    ..._
  })
}
