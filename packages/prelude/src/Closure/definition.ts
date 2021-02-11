/**
 * Base combine
 */
export interface Closure<A> {
  combine(r: A): (l: A) => A
}

export const ClosureURI = "Closure"
export type ClosureURI = typeof ClosureURI

declare module "@effect-ts/hkt" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [ClosureURI]: Closure<A>
  }
}
