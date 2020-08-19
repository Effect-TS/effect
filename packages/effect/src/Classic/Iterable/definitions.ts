/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export const IterableURI = "IterableURI"

/**
 * @since 1.0.0
 */
export type IterableURI = typeof IterableURI

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [IterableURI]: Iterable<A>
  }
}
