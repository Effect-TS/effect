/**
 * Base combine
 */
export interface Closure<A> {
  combine(r: A): (l: A) => A
}

export const ClosureURI = "Closure"

export type ClosureURI = typeof ClosureURI

declare module "../../Prelude/HKT" {
  interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [ClosureURI]: Closure<A>
  }
}

export const makeClosure = <A>(f: (l: A, r: A) => A): Closure<A> => ({
  combine: (r) => (l) => f(l, r)
})
