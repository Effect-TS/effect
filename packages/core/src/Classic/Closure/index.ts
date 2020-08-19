/**
 * @since 1.0.0
 */

/**
 * Base combine
 *
 * @since 1.0.0
 */
export interface Closure<A> {
  combine(r: A): (l: A) => A
}

/**
 * @since 1.0.0
 */
export const ClosureURI = "Closure"
/**
 * @since 1.0.0
 */
export type ClosureURI = typeof ClosureURI

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [ClosureURI]: Closure<A>
  }
}

/**
 * @since 1.0.0
 */
export const makeClosure = <A>(f: (l: A, r: A) => A): Closure<A> => ({
  combine: (r) => (l) => f(l, r)
})
