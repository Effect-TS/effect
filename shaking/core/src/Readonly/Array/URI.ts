/**
 * @since 2.5.0
 */
export const URI = "ReadonlyArray"
/**
 * @since 2.5.0
 */
export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly ReadonlyArray: ReadonlyArray<A>
  }
}
