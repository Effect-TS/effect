export const IterableURI = "IterableURI"
export type IterableURI = typeof IterableURI

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [IterableURI]: Iterable<A>
  }
}
