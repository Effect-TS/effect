import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly any: <S, SI, SO = SI>() => HKTFix<
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
    unknown
  >
}

export interface AnyK<F extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly any: <S, SI, SO = SI>() => KindFix<
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
    unknown
  >
}

export function makeAny<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<AnyK<URI, Fix0, Fix1, Fix2, Fix3>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3">
) => AnyK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAny<URI, Fix0, Fix1, Fix2, Fix3>(
  URI: URI
): (
  _: Omit<AnyF<URI, Fix0, Fix1, Fix2, Fix3>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3">
) => AnyF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAny<URI, Fix0, Fix1, Fix2, Fix3>(
  URI: URI
): (
  _: Omit<AnyF<URI, Fix0, Fix1, Fix2, Fix3>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3">
) => AnyF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}
