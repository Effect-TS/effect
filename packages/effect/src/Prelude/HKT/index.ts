/**
 * @since 1.0.0
 */
export interface F_<A> {
  URI: UF_
  A: A
}

/**
 * @since 1.0.0
 */
export const UF_ = "F_"

/**
 * @since 1.0.0
 */
export type UF_ = typeof UF_

/**
 * @since 1.0.0
 */
export interface F__<E, A> {
  URI: UF__
  E: E
  A: A
}

/**
 * @since 1.0.0
 */
export const UF__ = "F__"
/**
 * @since 1.0.0
 */
export type UF__ = typeof UF__

/**
 * @since 1.0.0
 */
export interface F___<R, E, A> {
  URI: UF___
  E: E
  A: A
  R: R
}

/**
 * @since 1.0.0
 */
export const UF___ = "F___"

/**
 * @since 1.0.0
 */
export type UF___ = typeof UF___

/**
 * @since 1.0.0
 */
export interface F____<S, R, E, A> {
  URI: UF____
  E: E
  A: A
  R: R
  S: S
}

/**
 * @since 1.0.0
 */
export const UF____ = "F____"
/**
 * @since 1.0.0
 */
export type UF____ = typeof UF____

/**
 * @since 1.0.0
 */
export const UG_ = "G_"
/**
 * @since 1.0.0
 */
export type UG_ = typeof UG_

/**
 * @since 1.0.0
 */
export interface G_<A> {
  URI: UG_
  A: A
}

/**
 * @since 1.0.0
 */
export interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
  [UF_]: F_<A>
  [UG_]: G_<A>
  [UF__]: F__<E, A>
  [UF___]: F___<R, E, A>
  [UF____]: F____<S, R, E, A>
}

/**
 * @since 1.0.0
 */
export const HKTFullURI = "HKTFullURI"
/**
 * @since 1.0.0
 */
export type HKTFullURI = typeof HKTFullURI

/**
 * @since 1.0.0
 */
export interface HKTFull<K, SI, SO, X, I, S, R, E, A> {
  URI: HKTFullURI
  K: () => K
  SI: (_: SI) => void
  SO: () => SO
  X: () => X
  I: (_: I) => void
  S: S
  R: (_: R) => void
  E: () => E
  A: A
}

/**
 * @since 1.0.0
 */
export type URIS = keyof URItoKind<any, any, any, any, any, any, any, any, any, any>

/**
 * @since 1.0.0
 */
export type Kind<
  URI extends URIS,
  N extends string,
  K,
  SI,
  SO,
  X,
  I,
  S,
  R,
  E,
  A
> = URI extends URIS ? URItoKind<N, K, SI, SO, X, I, S, R, E, A>[URI] : never

/**
 * @since 1.0.0
 */
export interface Auto {
  readonly Auto: unique symbol
}

export {
  /**
   * @since 1.0.0
   */
  FixE,
  /**
   * @since 1.0.0
   */
  FixI,
  /**
   * @since 1.0.0
   */
  FixK,
  /**
   * @since 1.0.0
   */
  FixN,
  /**
   * @since 1.0.0
   */
  FixR,
  /**
   * @since 1.0.0
   */
  FixS,
  /**
   * @since 1.0.0
   */
  FixX,
  /**
   * @since 1.0.0
   */
  OrE,
  /**
   * @since 1.0.0
   */
  OrI,
  /**
   * @since 1.0.0
   */
  OrK,
  /**
   * @since 1.0.0
   */
  OrN,
  /**
   * @since 1.0.0
   */
  OrR,
  /**
   * @since 1.0.0
   */
  OrS,
  /**
   * @since 1.0.0
   */
  OrX
} from "./fix"

export {
  /**
   * @since 1.0.0
   */
  instance
} from "./instance"

/**
 * @since 1.0.0
 */
export interface Base<F> {
  F: F
}

/**
 * @since 1.0.0
 */
export interface CompositionBase2<F, G> {
  F: F
  G: G
}
