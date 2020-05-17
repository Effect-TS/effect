export const URI = "Array"

export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly Array: Array<A>
  }
}
