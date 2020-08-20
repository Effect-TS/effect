/**
 * Base combine
 */
export interface Closure<A> {
  combine(r: A): (l: A) => A
}

export const ClosureURI = "Closure"
export type ClosureURI = typeof ClosureURI

declare module "../HKT" {
  interface URItoKind<
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    I,
    S,
    Env,
    Err,
    Out
  > {
    [ClosureURI]: Closure<Out>
  }
}

export const makeClosure = <A>(f: (l: A, r: A) => A): Closure<A> => ({
  combine: (r) => (l) => f(l, r)
})
