export type Reader<R, A> = (r: R) => A

export const ReaderURI = "Reader"
export type ReaderURI = typeof ReaderURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [ReaderURI]: Reader<R, A>
  }
}
