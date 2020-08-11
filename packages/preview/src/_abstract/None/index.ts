import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * The identity for combining two values of types `F[A]` and `F[B]`
 */
export interface NoneF<F, Fix = any> extends HasURI<F, Fix> {
  readonly None: "None"
  readonly none: <S, SI, SO = SI>() => HKTFix<
    F,
    Fix,
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

export interface NoneK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly None: "None"
  readonly none: <S, SI, SO = SI>() => KindFix<
    F,
    Fix,
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

export function makeNone<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<NoneK<URI, Fix>, "URI" | "Fix" | "None">) => NoneK<URI, Fix>
export function makeNone<URI, Fix = any>(
  URI: URI
): (_: Omit<NoneF<URI, Fix>, "URI" | "Fix" | "None">) => NoneF<URI, Fix>
export function makeNone<URI, Fix = any>(
  URI: URI
): (_: Omit<NoneF<URI, Fix>, "URI" | "Fix" | "None">) => NoneF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    None: "None",
    ..._
  })
}
