export const ShowURI = "Show"
export type ShowURI = typeof ShowURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [ShowURI]: Show<A>
  }
}

/**
 * `Show[A]` provides implicit evidence that values of type `A` have a total
 * ordering.
 */
export interface Show<A> {
  readonly show: (x: A) => string
}

/**
 * Creates Show[A] from equals & compare functions
 */
export function makeShow<A>(show: (x: A) => string): Show<A> {
  return {
    show
  }
}
