import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * @since 2.5.0
 */

export const URI = "ReadonlyRecord"
/**
 * @since 2.5.0
 */

export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly ReadonlyRecord: ReadonlyRecord<string, A>
  }
}
