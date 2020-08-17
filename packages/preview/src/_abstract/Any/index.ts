import { HasURI, HKTFull, KindFull, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly any: <S, SI, SO = SI>() => HKTFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
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

export interface AnyK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly any: <S, SI, SO = SI>() => KindFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
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
