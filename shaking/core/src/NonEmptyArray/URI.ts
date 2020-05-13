import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const URI = "NonEmptyArray"
/**
 * @since 2.0.0
 */
export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly NonEmptyArray: NonEmptyArray<A>
  }
}
