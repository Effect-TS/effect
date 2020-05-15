/**
 * @since 2.0.0
 */
export const URI = "Record"

/**
 * @since 2.0.0
 */
export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly Record: Record<string, A>
  }
}
