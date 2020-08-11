import { HasConstrainedE, HasURI, HKT10, HKTFix, Kind, KindFix, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F, Fix = any> extends HasURI<F, Fix> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => HKTFix<
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
    unknown
  >
}

export interface AnyK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => KindFix<
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
    unknown
  >
}

export interface AnyFE<F, E> extends HasConstrainedE<F, E> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => HKT10<
    F,
    never,
    never,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    E,
    unknown
  >
}

export interface AnyKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => Kind<
    F,
    never,
    never,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    E,
    unknown
  >
}

export function makeAny<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<AnyK<URI, Fix>, "URI" | "Fix" | "Any">) => AnyK<URI, Fix>
export function makeAny<URI, Fix>(
  URI: URI
): (_: Omit<AnyF<URI, Fix>, "URI" | "Fix" | "Any">) => AnyF<URI, Fix>
export function makeAny<URI, Fix>(
  URI: URI
): (_: Omit<AnyF<URI, Fix>, "URI" | "Fix" | "Any">) => AnyF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    Any: "Any",
    ..._
  })
}
