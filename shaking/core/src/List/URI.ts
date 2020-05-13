import type { List } from "./common"

export const URI = "@matechs/core/List"
export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    [URI]: List<A>
  }
}
