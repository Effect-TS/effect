/**
 * `Show[A]` provides implicit evidence that values of type `A` have a total
 * ordering.
 */
export interface Show<A> {
  readonly show: (x: A) => string
}

export const ShowURI = "Show"
export type ShowURI = typeof ShowURI

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [ShowURI]: Show<A>
  }
}

/**
 * Creates Show[A] from equals & compare functions
 */
export function makeShow<A>(show: (x: A) => string): Show<A> {
  return {
    show
  }
}
