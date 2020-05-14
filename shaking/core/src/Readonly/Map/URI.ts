/**
 * @since 2.5.0
 */
export const URI = "ReadonlyMap"

/**
 * @since 2.5.0
 */
export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind2<E, A> {
    readonly ReadonlyMap: ReadonlyMap<E, A>
  }
}
